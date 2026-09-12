import { supabase } from "./supabase.js";
import { findKnowledgeAnswer } from "./knowledge.js";
import { processMessage as processAIMessage } from "./ai.js";

interface AutoReplyRule {
  id: number;
  keyword: string;
  reply: string;
  match_type: "exact" | "contains" | "starts" | "regex";
  platform: string;
  is_active: boolean;
}

export interface SaveMessageParams {
  sender: string;
  name: string | null;
  message: string;
  direction: "incoming" | "outgoing";
  platform: string;
  instance_id?: string | null;
  recipient?: string | null;
  is_read?: boolean;
}

export interface IncomingMessageParams {
  from: string;
  text: string;
  platform: string;
  instanceId?: string;
  senderName?: string | null;
  recipient?: string | null;
  userId?: string;
}

async function saveMessage(params: SaveMessageParams): Promise<void> {
  const { error } = await supabase.from("bot_chats").insert({
    sender: params.sender,
    name: params.name || null,
    message: params.message,
    direction: params.direction,
    platform: params.platform,
    instance_id: params.instance_id || null,
    recipient: params.recipient || null,
    is_read: params.is_read ?? false,
  });

  if (error) {
    console.error(`[MessageBus] Gagal simpan pesan ${params.direction} (${params.platform}):`, error.message);
  }
}

function matchAutoReply(text: string, rule: AutoReplyRule): boolean {
  switch (rule.match_type) {
    case "exact": return text.toLowerCase() === rule.keyword.toLowerCase();
    case "contains": return text.toLowerCase().includes(rule.keyword.toLowerCase());
    case "starts": return text.toLowerCase().startsWith(rule.keyword.toLowerCase());
    case "regex":
      try { return new RegExp(rule.keyword, "i").test(text); } catch { return false; }
    default: return false;
  }
}

async function checkAutoReply(text: string, platform?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("bot_auto_reply")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error || !data) return null;

    const rules = data as AutoReplyRule[];
    for (const rule of rules) {
      if (rule.platform && rule.platform !== platform) continue;
      if (matchAutoReply(text, rule)) {
        console.log(`[AutoReply] Matched "${rule.keyword}" (${rule.match_type}) → "${rule.reply.substring(0, 40)}..."`);
        return rule.reply;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function generateReply(text: string, senderName: string, userId?: string, platform?: string): Promise<string | null> {
  // 1. Auto-reply rules (user-defined, fast & cheap)
  let answer = await checkAutoReply(text, platform);
  // 2. AI dengan knowledge base sebagai referensi — jawaban rapi & natural
  if (!answer) {
    answer = await processAIMessage(text, senderName, userId, platform);
  }
  // 3. Direct knowledge match (fallback jika AI gagal)
  if (!answer) {
    answer = await findKnowledgeAnswer(text, userId);
  }
  return answer;
}

export const messageBus = {
  saveMessage,

  async handleIncoming(msg: IncomingMessageParams): Promise<string | null> {
    const senderName = msg.senderName || msg.from.split("@")[0];

    await saveMessage({
      sender: msg.from,
      name: senderName,
      message: msg.text,
      direction: "incoming",
      platform: msg.platform,
      instance_id: msg.instanceId,
      recipient: msg.recipient || null,
      is_read: false,
    });

    const reply = await generateReply(msg.text, senderName, msg.userId, msg.platform);
    return reply;
  },

  async saveOutgoing(params: {
    to: string;
    text: string;
    platform: string;
    senderName?: string | null;
    instanceId?: string;
    recipient?: string | null;
  }): Promise<void> {
    await saveMessage({
      sender: params.to,
      name: params.senderName || null,
      message: params.text,
      direction: "outgoing",
      platform: params.platform,
      instance_id: params.instanceId || null,
      recipient: params.recipient || null,
      is_read: true,
    });
  },
};
