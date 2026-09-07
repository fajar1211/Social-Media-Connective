import { createFileRoute } from "@tanstack/react-router";

const VERIFY_TOKEN = "socmed_webhook_2026";

export const Route = createFileRoute("/api/webhook/instagram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
          console.log("[Webhook] Instagram webhook verified");
          return new Response(challenge, { status: 200 });
        }

        console.warn("[Webhook] Verification failed", { mode, token });
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const object = body.object;

          if (object === "instagram") {
            const entries = body.entry || [];
            for (const entry of entries) {
              const event = entry.changes?.[0];
              if (event) {
                console.log("[Webhook] Instagram event:", {
                  field: event.field,
                  value: event.value,
                });
              }
            }
          }

          return new Response("OK", { status: 200 });
        } catch (err) {
          console.error("[Webhook] Error processing event:", err);
          return new Response("OK", { status: 200 });
        }
      },
    },
  },
});
