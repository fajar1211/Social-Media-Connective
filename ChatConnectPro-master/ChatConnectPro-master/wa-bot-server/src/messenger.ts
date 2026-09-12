import { createHmac } from "crypto";
import { messageBus } from "./message-bus.js";

const MESSENGER_API = "https://graph.facebook.com/v22.0/me";

export class MessengerClient {
  private pageId: string;
  private accessToken: string;
  private appSecret: string;

  constructor(pageId: string, accessToken: string, appSecret: string) {
    this.pageId = pageId;
    this.accessToken = accessToken;
    this.appSecret = appSecret;
  }

  private getAppSecretProof(): string {
    return createHmac("sha256", this.appSecret).update(this.accessToken).digest("hex");
  }

  verifyWebhook(mode: string, token: string, challenge: string, expectedToken: string): string | null {
    if (mode === "subscribe" && token === expectedToken) {
      console.log("[Messenger] Webhook verified");
      return challenge;
    }
    console.warn("[Messenger] Webhook verify failed — token mismatch");
    return null;
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      if (body.object !== "page") return;

      for (const entry of body.entry || []) {
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;
          const message = event.message;
          if (!senderId || !message?.text) continue;

          const text = message.text;
          const preview = text.substring(0, 60);
          console.log(`\n📩 [Messenger][${new Date().toLocaleTimeString()}] Pesan dari ${senderId}: ${preview}${text.length > 60 ? '...' : ''}`);

          // Fetch sender profile
          let senderName = senderId;
          try {
            const profile = await this.getUserProfile(senderId);
            if (profile?.name) senderName = profile.name;
          } catch {}

          const reply = await messageBus.handleIncoming({
            from: senderId,
            text,
            platform: "messenger",
            senderName,
          });

          if (reply) {
            await this.sendMessage(senderId, reply);
            console.log(`🤖 [Messenger] Membalas ${senderName}: ${reply.substring(0, 60)}...`);
          }
        }
      }
    } catch (err) {
      console.error("[Messenger] Webhook error:", err);
    }
  }

  async sendMessage(to: string, text: string): Promise<boolean> {
    try {
      const url = `${MESSENGER_API}/messages?access_token=${this.accessToken}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature": this.getAppSecretProof(),
        },
        body: JSON.stringify({
          recipient: { id: to },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[Messenger] Send message failed (${res.status}):`, errBody);
        return false;
      }

      await messageBus.saveOutgoing({
        to,
        text,
        platform: "messenger",
        senderName: null,
      });

      return true;
    } catch (err) {
      console.error("[Messenger] Send message error:", err);
      return false;
    }
  }

  async getUserProfile(psid: string): Promise<{ name: string; avatar?: string } | null> {
    try {
      const url = `${MESSENGER_API}/${psid}?fields=name,profile_pic&access_token=${this.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return { name: data.name, avatar: data.profile_pic };
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const url = `${MESSENGER_API}?fields=id,name&access_token=${this.accessToken}`;
      const res = await fetch(url);

      if (!res.ok) {
        const err = await res.text();
        return { ok: false, message: `API error: ${err}` };
      }

      const data = await res.json();
      return { ok: true, message: `Terhubung ke halaman: ${data.name || data.id}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }
}
