import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/facebook/schedule")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { pageId, pageAccessToken, message, link, scheduledPublishTime } = body;

          if (!pageId || !pageAccessToken || !message || !scheduledPublishTime) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: pageId, pageAccessToken, message, scheduledPublishTime" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const scheduledTime = Math.floor(new Date(scheduledPublishTime).getTime() / 1000);
          const now = Math.floor(Date.now() / 1000);

          if (scheduledTime <= now) {
            return new Response(
              JSON.stringify({ error: "Scheduled time must be in the future" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (scheduledTime > now + 6 * 30 * 24 * 60 * 60) {
            return new Response(
              JSON.stringify({ error: "Scheduled time cannot be more than 6 months in the future" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const params: Record<string, string | number> = {
            message,
            access_token: pageAccessToken,
            published: "false",
            scheduled_publish_time: scheduledTime,
          };

          if (link) {
            params["link"] = link;
          }

          const fbResponse = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(params),
            }
          );

          const fbData = await fbResponse.json();

          if (fbData.error) {
            return new Response(
              JSON.stringify({ error: fbData.error.message, code: fbData.error.code }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              postId: fbData.id,
              scheduledPublishTime: new Date(scheduledPublishTime).toISOString(),
              message: "Post scheduled successfully",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
