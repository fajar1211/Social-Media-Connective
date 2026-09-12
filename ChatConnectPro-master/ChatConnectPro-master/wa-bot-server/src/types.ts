export type BotStatusState = "connected" | "initializing" | "stopped" | "paused";

export interface BotStatus {
  status: string;
  bot: BotStatusState;
  phone: string | null;
  qr?: string | null;
}

export interface ChatMessage {
  id: number;
  sender: string;
  name: string | null;
  message: string;
  direction: "incoming" | "outgoing";
  recipient: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  sender: string;
  name: string;
  last_message: string;
  last_chat: string;
}

export interface KnowledgeItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BotInstance {
  id: string;
  user_id: string;
  phone: string | null;
  status: BotStatusState;
  instance_id: string;
  created_at: string;
  updated_at: string;
}
