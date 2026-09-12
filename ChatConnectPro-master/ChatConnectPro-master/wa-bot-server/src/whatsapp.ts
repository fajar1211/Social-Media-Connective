import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WAMessage,
  type WASocket,
  type AnyMessageContent,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { supabase } from "./supabase.js";
import type { BotStatusState } from "./types.js";
import { extractText, invalidateKnowledgeCache } from "./knowledge.js";
import { messageBus } from "./message-bus.js";

const AUTH_DIR = "wa_auth";

let sock: WASocket | null = null;
let botStatus: BotStatusState = "stopped";
let botPhone: string | null = null;
let currentQR: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const logger = pino({
  level: "info",
  transport: { target: "pino-pretty", options: { colorize: true } },
});

export function getBotStatus() {
  return { bot: botStatus, phone: botPhone, qr: currentQR };
}

export function getSocket() {
  return sock;
}

export async function startBot(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (sock) {
    sock.end(undefined);
    sock = null;
  }

  reconnectAttempts = 0;
  botStatus = "initializing";
  currentQR = null;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    logger,
    browser: ["ChatConnect Pro", "Chrome", "3.0"],
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      console.log("\n╔══════════════════════════════════╗");
      console.log("║       SCAN QR CODE WHATSAPP      ║");
      console.log("╚══════════════════════════════════╝");
      qrcode.generate(qr, { small: true });
      console.log("\nAtau akses QR via: http://localhost:3000/api/qr\n");
    }

    if (qr === undefined) {
      currentQR = null;
    }

    if (connection === "open") {
      botStatus = "connected";
      currentQR = null;
      const user = sock?.user;
      botPhone = user?.id ? user.id.split(":")[0] : null;
      console.log(`\n✅ WhatsApp terhubung sebagai: ${botPhone}\n`);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as any)?.cause || lastDisconnect?.error;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      botStatus = "stopped";
      botPhone = null;
      currentQR = null;
      sock = null;

      console.log(`\n❌ Koneksi WhatsApp terputus (reason: ${code})`);

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Mencoba reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) dalam 5 detik...\n`);
        reconnectTimer = setTimeout(() => {
          startBot().catch((err) => console.error("Reconnect failed:", err));
        }, 5000);
      } else if (shouldReconnect) {
        console.log(`⛔ Gagal reconnect setelah ${MAX_RECONNECT_ATTEMPTS} kali. Klik Connect untuk mencoba lagi.\n`);
      } else {
        console.log("🔒 Session telah dihapus. Klik Connect lagi untuk scan ulang.\n");
      }
    }
  });

  sock.ev.on("messages.upsert", async (data: { messages: WAMessage[]; type: string }) => {
    if (data.type !== "notify") return;
    for (const msg of data.messages) {
      await handleIncomingMessage(msg);
    }
  });
}

export function stopBot(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    sock.end(undefined);
    sock = null;
  }
  botStatus = "stopped";
  botPhone = null;
  currentQR = null;
}

export async function logoutBot(): Promise<void> {
  if (sock) {
    sock.logout();
    sock = null;
  }
  botStatus = "stopped";
  botPhone = null;
  currentQR = null;

  const fs = await import("fs/promises");
  try {
    await fs.rm(AUTH_DIR, { recursive: true, force: true });
  } catch {}
}

export async function sendMessage(
  to: string,
  text: string
): Promise<boolean> {
  if (!sock) return false;

  try {
    const jid = to.includes("@")
      ? to
      : `${to}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text } as AnyMessageContent);

    await messageBus.saveOutgoing({
      to: jid,
      text,
      platform: "whatsapp",
      recipient: sock.user?.id || null,
    });

    return true;
  } catch (err) {
    console.error("Send message error:", err);
    return false;
  }
}

async function handleIncomingMessage(msg: WAMessage): Promise<void> {
  try {
    if (!msg.key || msg.key.fromMe) return;

    const sender = msg.key.remoteJid || "";

    if (sender.includes("@g.us") || sender.includes("@broadcast")) return;

    const text = extractText(msg);
    if (!text) return;

    const pushName = msg.pushName || sender.split("@")[0] || null;
    const preview = text.substring(0, 60);
    console.log(`\n📩 [${new Date().toLocaleTimeString()}] Pesan dari ${pushName}: ${preview}${text.length > 60 ? '...' : ''}`);

    const reply = await messageBus.handleIncoming({
      from: sender,
      text,
      platform: "whatsapp",
      senderName: pushName,
    });

    if (reply && sock) {
      console.log(`🤖 Membalas: ${reply.substring(0, 60)}...`);
      await sock.sendMessage(sender, { text: reply } as AnyMessageContent);

      await messageBus.saveOutgoing({
        to: sender,
        text: reply,
        platform: "whatsapp",
        senderName: pushName,
        recipient: sock.user?.id || null,
      });
    } else {
      console.log(`❌ Tidak ada jawaban cocok di knowledge base`);
    }
  } catch (err) {
    console.error("Handle incoming message error:", err);
  }
}
