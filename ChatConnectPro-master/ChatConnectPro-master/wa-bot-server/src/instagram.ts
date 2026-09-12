import { messageBus } from "./message-bus.js";

const IG_GRAPH_API = "https://graph.facebook.com/v22.0";

export class InstagramClient {
  private pageId: string;
  private accessToken: string;
  private igUserId: string;

  constructor(pageId: string, accessToken: string, igUserId: string) {
    this.pageId = pageId;
    this.accessToken = accessToken;
    this.igUserId = igUserId;
  }

  verifyWebhook(mode: string, token: string, challenge: string, expectedToken: string): string | null {
    if (mode === "subscribe" && token === expectedToken) {
      console.log("[Instagram] Webhook verified");
      return challenge;
    }
    console.warn("[Instagram] Webhook verify failed — token mismatch");
    return null;
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      const entry = body?.entry?.[0];
      if (!entry) return;

      const changes = entry.changes?.[0];
      if (!changes) return;

      if (changes.field !== "messages") return;

      const messages = changes.value?.messages;
      if (!messages || messages.length === 0) return;

      for (const msg of messages) {
        const senderId = msg.from?.id;
        const text = msg.message?.text || "";
        if (!senderId || !text) continue;

        const senderName = msg.from?.username || senderId;
        const preview = text.substring(0, 60);
        console.log(`\n📩 [Instagram][${new Date().toLocaleTimeString()}] Pesan dari ${senderName}: ${preview}${text.length > 60 ? '...' : ''}`);

        const reply = await messageBus.handleIncoming({
          from: senderId,
          text,
          platform: "instagram",
          senderName,
        });

        if (reply) {
          await this.sendMessage(senderId, reply);
          console.log(`🤖 [Instagram] Membalas ${senderName}: ${reply.substring(0, 60)}...`);
        }
      }
    } catch (err) {
      console.error("[Instagram] Webhook error:", err);
    }
  }

  async sendMessage(to: string, text: string): Promise<boolean> {
    try {
      const url = `${IG_GRAPH_API}/${this.igUserId}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          recipient: { id: to },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[Instagram] Send message failed (${res.status}):`, errBody);
        return false;
      }

      await messageBus.saveOutgoing({
        to,
        text,
        platform: "instagram",
        senderName: null,
      });

      return true;
    } catch (err) {
      console.error("[Instagram] Send message error:", err);
      return false;
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(
        `${IG_GRAPH_API}/${this.igUserId}?fields=id,username,name&access_token=${this.accessToken}`
      );

      if (!res.ok) {
        const err = await res.text();
        return { ok: false, message: `API error: ${err}` };
      }

      const data = await res.json();
      return { ok: true, message: `Terhubung sebagai @${data.username || data.name || data.id}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }
}
