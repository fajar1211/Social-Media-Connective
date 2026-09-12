import {
  makeWASocket,
  DisconnectReason,
  type WAMessage,
  type WASocket,
  type AnyMessageContent,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { supabase } from "./supabase.js";

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";
import type { BotStatusState } from "./types.js";
import { extractText } from "./knowledge.js";
import { messageBus } from "./message-bus.js";
import { getSocket as getLegacySocket } from "./whatsapp.js";
import { useSupabaseAuthState, removeAllInstanceAuth } from "./supabase-auth.js";

interface BotInstanceData {
  sock: WASocket | null;
  status: BotStatusState;
  phone: string | null;
  qr: string | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  userId: string | null;
  explicitlyStopped: boolean; // true if user clicked disconnect/logout
}

const LOGGER = pino({
  level: "info",
  transport: { target: "pino-pretty", options: { colorize: true } },
});

const MAX_RECONNECT_ATTEMPTS = 5;

const HANDOFF_KEYWORDS = [
  "admin", "staff", "operator", "customer service", "live chat",
  "manusia", "orang", "cs", "agent", "live", "transfer",
  "bicara dengan", "ngomong sama", "ketemu", "dihubungkan",
  "sambungkan", "human", "real person",
];

const REACTIVATE_KEYWORDS = [
  "terima kasih atas waktu luang anda",
];

const PERSONAL_KEYWORDS = ["jar", "fajar", "fjr"];
const PERSONAL_REPLY = "Maaf, yang Anda sebutkan sedang tidak memegang HP. Mohon tunggu beberapa saat ya.";

const HANDOFF_REPLY = "Baik, tunggu beberapa saat ya. Kami akan menghubungkan Anda ke admin kami.";

async function sendDisconnectAlert(instanceId: string, reason: string): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "bot_disconnected",
        instanceId,
        reason,
        time: new Date().toISOString(),
        message: `[ChatConnect] Bot ${instanceId} disconnected: ${reason}`,
      }),
    });
  } catch {
    // Silently fail — alerts are best-effort
  }
}

function isHandoffRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return HANDOFF_KEYWORDS.some((k) => lower.includes(k));
}

function normalizeJid(jid: string): string {
  return jid.split("@")[0] + "@s.whatsapp.net";
}

class BotManager {
  private instances: Map<string, BotInstanceData> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private disabledSendersCache: Map<string, Set<string>> = new Map();

  createInstance(instanceId: string, userId?: string): void {
    if (this.instances.has(instanceId)) return;
    this.instances.set(instanceId, {
      sock: null,
      status: "stopped",
      phone: null,
      qr: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      userId: userId || null,
      explicitlyStopped: false,
    });
  }

  async startInstance(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`Instance ${instanceId} not found`);

    if (inst.reconnectTimer) {
      clearTimeout(inst.reconnectTimer);
      inst.reconnectTimer = null;
    }

    if (inst.sock) {
      inst.sock.end(undefined);
      inst.sock = null;
    }

    inst.reconnectAttempts = 0;
    inst.explicitlyStopped = false;
    inst.status = "initializing";
    inst.qr = null;

    const { state, saveCreds } = await useSupabaseAuthState(instanceId);

    const sock = makeWASocket({
      auth: state,
      logger: LOGGER,
      browser: ["ChatConnect Pro", "Chrome", "3.0"],
      syncFullHistory: false,
    });

    inst.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      // Abaikan event dari socket lama (race condition restart → close lama)
      if (inst.sock !== sock) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        inst.qr = qr;
        console.log(`\n╔══════════════════════════════════╗`);
        console.log(`║   SCAN QR (${instanceId})     ║`);
        console.log(`╚══════════════════════════════════╝`);
        console.log(`QR untuk instance ${instanceId} tersedia via API.\n`);

        await supabase
          .from("bot_instances")
          .update({ status: "initializing" })
          .eq("instance_id", instanceId);
      }

      if (qr === undefined) {
        inst.qr = null;
      }

      if (connection === "open") {
        inst.status = "connected";
        inst.qr = null;
        const user = sock?.user;
        inst.phone = user?.id ? user.id.split(":")[0] : null;

        console.log(`\n✅ [${instanceId}] WhatsApp terhubung sebagai: ${inst.phone}\n`);

        await supabase
          .from("bot_instances")
          .update({ status: "connected", phone: inst.phone })
          .eq("instance_id", instanceId);
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.cause || lastDisconnect?.error;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        inst.status = "stopped";
        inst.phone = null;
        inst.qr = null;
        inst.sock = null;

        console.log(`\n❌ [${instanceId}] Koneksi terputus (reason: ${code})`);

        // Kirim alert jika disconnect tidak diinginkan
        if (!inst.explicitlyStopped && code !== DisconnectReason.loggedOut) {
          sendDisconnectAlert(instanceId, `Connection closed (code: ${code})`);
        }

        await supabase
          .from("bot_instances")
          .update({ status: "stopped" })
          .eq("instance_id", instanceId);

        // Jangan auto-reconnect jika user sengaja memutuskan
        if (inst.explicitlyStopped) {
          console.log(`⏹️ [${instanceId}] User memutuskan koneksi — tidak auto-reconnect.\n`);
          inst.explicitlyStopped = false;
        } else if (shouldReconnect && inst.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          inst.reconnectAttempts++;
          console.log(`🔄 [${instanceId}] Reconnect (${inst.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) dalam 5 detik...\n`);
          inst.reconnectTimer = setTimeout(() => {
            this.startInstance(instanceId).catch((err) =>
              console.error(`[${instanceId}] Reconnect failed:`, err)
            );
          }, 5000);
        } else if (shouldReconnect) {
          console.log(`⛔ [${instanceId}] Gagal reconnect setelah ${MAX_RECONNECT_ATTEMPTS} kali.\n`);
        } else {
          console.log(`🔒 [${instanceId}] Session dihapus. Scan ulang.\n`);
        }
      }
    });

    sock.ev.on("messages.upsert", async (data: { messages: WAMessage[]; type: string }) => {
      if (inst.sock !== sock) return;
      if (data.type !== "notify") return;
      for (const msg of data.messages) {
        const msgId = msg.key?.id;
        if (msgId && this.processedMessageIds.has(msgId)) {
          console.log(`⏭️ [${instanceId}] Duplicate message ${msgId} — skipping`);
          continue;
        }
        if (msgId) {
          this.processedMessageIds.add(msgId);
          setTimeout(() => this.processedMessageIds.delete(msgId), 5000);
        }
        await this.handleIncomingMessage(instanceId, msg);
      }
    });
  }

  pauseInstance(instanceId: string): void {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    inst.status = "paused";
    console.log(`⏸️ [${instanceId}] Bot dijeda — tidak akan membalas pesan masuk`);
  }

  resumeInstance(instanceId: string): void {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    inst.status = "connected";
    console.log(`▶️ [${instanceId}] Bot dilanjutkan — akan membalas pesan masuk`);
  }

  stopInstance(instanceId: string): void {
    const inst = this.instances.get(instanceId);
    if (!inst) return;

    if (inst.reconnectTimer) {
      clearTimeout(inst.reconnectTimer);
      inst.reconnectTimer = null;
    }
    if (inst.sock) {
      inst.sock.end(undefined);
      inst.sock = null;
    }
    inst.explicitlyStopped = true;
    inst.status = "stopped";
    inst.phone = null;
    inst.qr = null;
  }

  async logoutInstance(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) return;

    // Hanya putus socket — TIDAK logout dari WhatsApp, TIDAK hapus auth folder
    // agar bisa reconnect tanpa scan QR lagi
    inst.explicitlyStopped = true;
    inst.status = "stopped";
    inst.phone = null;
    inst.qr = null;

    if (inst.reconnectTimer) {
      clearTimeout(inst.reconnectTimer);
      inst.reconnectTimer = null;
    }

    if (inst.sock) {
      inst.sock.end(undefined);
      inst.sock = null;
    }
  }

  async fullLogoutInstance(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) return;

    inst.explicitlyStopped = true;
    inst.status = "stopped";
    inst.phone = null;
    inst.qr = null;

    if (inst.reconnectTimer) {
      clearTimeout(inst.reconnectTimer);
      inst.reconnectTimer = null;
    }

    if (inst.sock) {
      inst.sock.logout();
      inst.sock = null;
    }

    await removeAllInstanceAuth(instanceId);
  }

  getStatus(instanceId: string): { bot: BotStatusState; phone: string | null; qr: string | null } {
    const inst = this.instances.get(instanceId);
    if (!inst) return { bot: "stopped", phone: null, qr: null };
    return { bot: inst.status, phone: inst.phone, qr: inst.qr };
  }

  // ── Handoff / Disabled Senders ──

  private async loadDisabledSenders(instanceId: string): Promise<Set<string>> {
    if (this.disabledSendersCache.has(instanceId)) {
      return this.disabledSendersCache.get(instanceId)!;
    }
    try {
      const { data } = await supabase
        .from("bot_instances")
        .select("disabled_senders")
        .eq("instance_id", instanceId)
        .single();
      const arr: string[] = (data as any)?.disabled_senders || [];
      const set = new Set(arr);
      this.disabledSendersCache.set(instanceId, set);
      return set;
    } catch {
      const set = new Set<string>();
      this.disabledSendersCache.set(instanceId, set);
      return set;
    }
  }

  private async saveDisabledSenders(instanceId: string, set: Set<string>): Promise<void> {
    this.disabledSendersCache.set(instanceId, set);
    try {
      await supabase
        .from("bot_instances")
        .update({ disabled_senders: Array.from(set) } as any)
        .eq("instance_id", instanceId);
    } catch (err) {
      console.error(`[${instanceId}] Gagal simpan disabled_senders:`, err);
    }
  }

  async isSenderDisabled(instanceId: string, sender: string): Promise<boolean> {
    const set = await this.loadDisabledSenders(instanceId);
    const normalized = normalizeJid(sender);
    for (const jid of set) {
      if (normalizeJid(jid) === normalized) return true;
    }
    return false;
  }

  async disableBotForSender(instanceId: string, sender: string): Promise<void> {
    const jid = normalizeJid(sender);
    const set = await this.loadDisabledSenders(instanceId);
    set.add(jid);
    await this.saveDisabledSenders(instanceId, set);
    console.log(`🤚 [${instanceId}] Bot dinonaktifkan untuk ${jid}`);
  }

  async enableBotForSender(instanceId: string, sender: string): Promise<void> {
    const jid = normalizeJid(sender);
    const set = await this.loadDisabledSenders(instanceId);
    for (const stored of set) {
      if (normalizeJid(stored) === jid) {
        set.delete(stored);
        break;
      }
    }
    await this.saveDisabledSenders(instanceId, set);
    console.log(`✅ [${instanceId}] Bot diaktifkan kembali untuk ${jid}`);
  }

  async getDisabledSenders(instanceId: string): Promise<string[]> {
    const set = await this.loadDisabledSenders(instanceId);
    return Array.from(set);
  }

  async sendMessage(instanceId: string, to: string, text: string, fromScheduler = false): Promise<boolean> {
    const inst = this.instances.get(instanceId);
    const sock = inst?.sock || getLegacySocket();
    if (!sock) {
      console.log(`[sendMessage] ⏳ ${instanceId} menunggu socket (status=${inst?.status || 'no-instance'})`);
      return false;
    }

    try {
      const jid = to.includes("@")
        ? to
        : `${to}@s.whatsapp.net`;

      await sock.sendMessage(jid, { text } as AnyMessageContent);

      await messageBus.saveOutgoing({
        to: jid,
        text,
        platform: "whatsapp",
        instanceId,
        recipient: sock.user?.id || null,
      });

      if (!fromScheduler) {
        const lower = text.toLowerCase();
        const isReactivate = REACTIVATE_KEYWORDS.some((k) => lower.includes(k));
        if (isReactivate) {
          await this.enableBotForSender(instanceId, jid);
        } else {
          await this.disableBotForSender(instanceId, jid);
        }
      }

      return true;
    } catch (err) {
      console.error(`[sendMessage] 💥 ${instanceId} error:`, err);
      return false;
    }
  }

  getAllInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  registerLegacyInstance(instanceId: string, sock: WASocket | null, phone: string | null, userId?: string): void {
    this.instances.set(instanceId, {
      sock,
      status: phone ? "connected" : "stopped",
      phone,
      qr: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      userId: userId || null,
      explicitlyStopped: false,
    });
  }

  async restoreInstances(): Promise<void> {
    try {
      const { data: instances } = await supabase
        .from("bot_instances")
        .select("instance_id, user_id, status");

      if (!instances || instances.length === 0) return;

      // Cek apakah ada auth data di Supabase untuk setiap instance
      const recovered: string[] = [];
      for (const inst of instances) {
        const { count } = await supabase
          .from("bot_auth_store")
          .select("id", { count: "exact", head: true })
          .eq("instance_id", inst.instance_id);
        if (count && count > 0) {
          recovered.push(inst.instance_id);
        }
      }

      if (recovered.length === 0) return;

      console.log(`\n🔄 Menemukan ${recovered.length} saved session di Supabase, mencoba restore...`);
      for (const instanceId of recovered) {
        const instRow = instances.find((i) => i.instance_id === instanceId);
        this.createInstance(instanceId, instRow?.user_id || undefined);
        await this.startInstance(instanceId).catch((err) =>
          console.error(`[${instanceId}] Restore failed:`, err.message)
        );
        if (instRow?.status === "paused") {
          const inst = this.instances.get(instanceId);
          if (inst && inst.status === "connected") {
            inst.status = "paused";
            console.log(`⏸️ [${instanceId}] Restore: status paused dari DB`);
          }
        }
      }
    } catch {
      // Restore gagal, lanjutkan tanpa restore
    }
  }

  removeInstance(instanceId: string): void {
    const inst = this.instances.get(instanceId);
    if (inst) {
      if (inst.reconnectTimer) clearTimeout(inst.reconnectTimer);
      if (inst.sock) {
        inst.sock.end(undefined);
      }
    }
    this.instances.delete(instanceId);
  }

  private async handleIncomingMessage(instanceId: string, msg: WAMessage): Promise<void> {
    const inst = this.instances.get(instanceId);
    try {
      if (!msg.key || msg.key.fromMe) return;

      const sender = msg.key.remoteJid || "";

      if (inst?.status === "paused") {
        console.log(`⏸️ [${instanceId}] Bot sedang dijeda — skip pesan dari ${msg.pushName || sender}`);
        return;
      }

      if (sender.includes("@g.us") || sender.includes("@broadcast")) return;

      const text = extractText(msg);
      if (!text) return;

      const pushName = msg.pushName || sender.split("@")[0] || null;
      const botNumber = inst?.sock?.user?.id?.split(":")[0] || null;
      const preview = text.substring(0, 60);
      console.log(`\n📩 [${instanceId}][${new Date().toLocaleTimeString()}] Pesan dari ${pushName}: ${preview}${text.length > 60 ? '...' : ''}`);

      // Look up userId if not cached
      let lookupUserId = inst?.userId || null;
      if (!lookupUserId) {
        const { data: instRow } = await supabase
          .from("bot_instances")
          .select("user_id")
          .eq("instance_id", instanceId)
          .single();
        if (instRow?.user_id) {
          lookupUserId = instRow.user_id;
          if (inst) inst.userId = lookupUserId;
          console.log(`[${instanceId}] User ID found: ${instRow.user_id.slice(0, 8)}...`);
        } else {
          console.warn(`[${instanceId}] ⚠️ Tidak ditemukan user_id untuk instance ${instanceId}`);
        }
      }

      const userId = lookupUserId || undefined;

      // Command /stop dan /start dari customer via WhatsApp (tanpa balas)
      const trimmed = text.trim().toLowerCase();
      if (trimmed === "/stop" || trimmed === "/start") {
        if (trimmed === "/stop") {
          await this.disableBotForSender(instanceId, sender);
          console.log(`🛑 [${instanceId}] ${pushName || sender} menonaktifkan bot via /stop`);
          await messageBus.saveOutgoing({
            to: sender,
            text: `🔔 ${pushName || "Customer"} menonaktifkan bot. Bot tidak akan membalas otomatis.`,
            platform: "whatsapp",
            instanceId,
            senderName: "System",
            recipient: botNumber,
          });
        } else {
          await this.enableBotForSender(instanceId, sender);
          console.log(`▶️ [${instanceId}] ${pushName || sender} mengaktifkan bot via /start`);
          await messageBus.saveOutgoing({
            to: sender,
            text: `🔔 ${pushName || "Customer"} mengaktifkan bot kembali. Bot akan membalas otomatis.`,
            platform: "whatsapp",
            instanceId,
            senderName: "System",
            recipient: botNumber,
          });
        }
        return;
      }

      // Deteksi personal message (panggilan nama orang, bukan untuk bot)
      const firstWord = text.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9]/g, "") || "";
      if (PERSONAL_KEYWORDS.some((k) => firstWord.startsWith(k))) {
        console.log(`👤 [${instanceId}] Personal message dari ${pushName || sender} — "${text.substring(0, 40)}"`);
        if (inst?.sock) {
          await inst.sock.sendMessage(sender, { text: PERSONAL_REPLY } as AnyMessageContent);
          await messageBus.saveOutgoing({
            to: sender,
            text: PERSONAL_REPLY,
            platform: "whatsapp",
            instanceId,
            senderName: pushName || undefined,
            recipient: inst.sock.user?.id || null,
          });
        }
        return;
      }

      // Cek apakah bot dinonaktifkan untuk sender ini (handoff)
      const senderDisabled = await this.isSenderDisabled(instanceId, sender);
      if (senderDisabled) {
        console.log(`🤚 [${instanceId}] Bot nonaktif untuk ${pushName || sender} — skip auto-reply`);
        return;
      }

      // Deteksi handoff request
      if (isHandoffRequest(text)) {
        console.log(`🙋 [${instanceId}] Handoff diminta oleh ${pushName || sender}`);
        if (inst?.sock) {
          await inst.sock.sendMessage(sender, { text: HANDOFF_REPLY } as AnyMessageContent);
          await messageBus.saveOutgoing({
            to: sender,
            text: HANDOFF_REPLY,
            platform: "whatsapp",
            instanceId,
            senderName: pushName,
            recipient: inst.sock.user?.id || null,
          });
        }
        await this.disableBotForSender(instanceId, sender);
        await messageBus.saveOutgoing({
          to: sender,
          text: `🙋 ${pushName || "Customer"} minta bicara admin. Bot otomatis dinonaktifkan.`,
          platform: "whatsapp",
          instanceId,
          senderName: "System",
          recipient: botNumber,
        });
        return;
      }

      const reply = await messageBus.handleIncoming({
        from: sender,
        text,
        platform: "whatsapp",
        instanceId,
        senderName: pushName,
        userId,
      });

      const replyText = reply || "Maaf, saya belum bisa menjawab pertanyaan Anda saat ini.";

      if (inst?.sock) {
        console.log(`🤖 [${instanceId}] Membalas: ${replyText.substring(0, 60)}...`);
        await inst.sock.sendMessage(sender, { text: replyText } as AnyMessageContent);

        await messageBus.saveOutgoing({
          to: sender,
          text: replyText,
          platform: "whatsapp",
          instanceId,
          senderName: pushName,
          recipient: inst.sock.user?.id || null,
        });
      } else {
        console.log(`❌ [${instanceId}] Tidak bisa mengirim, socket tidak tersedia`);
      }
    } catch (err) {
      console.error(`[${instanceId}] Handle incoming message error:`, err);
    }
  }

  getSocket(instanceId: string): WASocket | null {
    return this.instances.get(instanceId)?.sock || null;
  }
}

export const botManager = new BotManager();
