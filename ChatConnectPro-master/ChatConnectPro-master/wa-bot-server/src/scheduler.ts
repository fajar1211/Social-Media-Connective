import { supabase } from "./supabase.js";
import { botManager } from "./bot-manager.js";
import { sendMessage as legacySend } from "./whatsapp.js";

const POLL_INTERVAL = 15_000;
const STALE_TIMEOUT_MS = 5 * 60 * 1000;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function trySend(instanceId: string | null, recipient: string, message: string): Promise<{ sent: boolean; noConnected: boolean }> {
  const allIds = botManager.getAllInstances();
  const anyConnected = allIds.some((id) => botManager.getStatus(id).bot === "connected");

  if (instanceId) {
    const s = botManager.getStatus(instanceId);
    if (s.bot === "connected") {
      const ok = await botManager.sendMessage(instanceId, recipient, message, true);
      if (ok) return { sent: true, noConnected: false };
    }
  }
  for (const id of allIds) {
    const s = botManager.getStatus(id);
    if (s.bot === "connected") {
      const ok = await botManager.sendMessage(id, recipient, message, true);
      if (ok) return { sent: true, noConnected: false };
    }
  }
  const ok = await legacySend(recipient, message);
  return { sent: ok, noConnected: !anyConnected };
}

async function cleanupStaleClaims(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();
  const { data, error } = await supabase
    .from("bot_scheduled")
    .update({ sent_at: null })
    .eq("status", "pending")
    .not("sent_at", "is", null)
    .lte("updated_at", cutoff)
    .select();

  if (error) {
    console.error("[Scheduler] Gagal cleanup stale claim:", error.message);
  } else if (data && data.length > 0) {
    console.log(`[Scheduler] Cleanup ${data.length} claim stale → sent_at null`);
  }
}

async function processScheduledMessages(): Promise<void> {
  try {
    await cleanupStaleClaims();

    const now = new Date().toISOString();
    const { data: messages, error } = await supabase
      .from("bot_scheduled")
      .update({ sent_at: now, updated_at: now })
      .eq("status", "pending")
      .is("sent_at", null)
      .lte("scheduled_at", now)
      .select();

    if (error) {
      console.error("[Scheduler] Query error:", error.message);
      return;
    }

    if (!messages || messages.length === 0) return;

    console.log(`[Scheduler] Memproses ${messages.length} pesan terjadwal...`);

    for (const msg of messages) {
      const { id, instance_id, recipient, message } = msg;
      try {
        const result = await trySend(instance_id, recipient, message);
        if (result.sent) {
          await supabase
            .from("bot_scheduled")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", id);
          console.log(`[Scheduler] ✅ Pesan ${id} terkirim ke ${recipient}`);
        } else if (result.noConnected) {
          await supabase
            .from("bot_scheduled")
            .update({ sent_at: null })
            .eq("id", id);
          console.log(`[Scheduler] ⏳ Pesan ${id} ditunda (belum ada instance connected) — akan retry`);
        } else {
          await supabase
            .from("bot_scheduled")
            .update({ status: "failed", sent_at: null })
            .eq("id", id);
          console.error(`[Scheduler] ❌ Pesan ${id} gagal dikirim ke ${recipient}`);
        }
      } catch (err: any) {
        console.error(`[Scheduler] 💥 Pesan ${id} error:`, err);
        await supabase
          .from("bot_scheduled")
          .update({ sent_at: null })
          .eq("id", id);
      }
    }
  } catch (err: any) {
    console.error("[Scheduler] Error:", err.message);
  }
}

export function startScheduler(): void {
  if (intervalHandle) return;
  console.log("[Scheduler] Dimulai — poll setiap 15 detik");
  processScheduledMessages();
  intervalHandle = setInterval(processScheduledMessages, POLL_INTERVAL);
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[Scheduler] Dihentikan");
  }
}
