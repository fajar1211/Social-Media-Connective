import { createFileRoute } from "@tanstack/react-router";

const GRAPH_API_VERSION = "v21.0";

export const Route = createFileRoute("/api/instagram/schedule")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { igUserId, accessToken, imageUrl, caption, scheduledPublishTime } = body;

          if (!igUserId || !accessToken || !scheduledPublishTime) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: igUserId, accessToken, scheduledPublishTime" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          let scheduledTime: number;
          if (typeof scheduledPublishTime === "number") {
            scheduledTime = Math.floor(scheduledPublishTime);
          } else {
            scheduledTime = Math.floor(new Date(scheduledPublishTime).getTime() / 1000);
          }
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

          const containerParams: Record<string, string | number> = {
            access_token: accessToken,
            published: "false",
            scheduled_publish_time: scheduledTime,
          };

          if (imageUrl && imageUrl.startsWith("data:")) {
            const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) {
              return new Response(
                JSON.stringify({ error: "Invalid data URL format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const mimeType = match[1];
            const base64Data = match[2];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mimeType });
            const ext = mimeType.split("/")[1] || "jpg";

            const formData = new FormData();
            formData.append("source", blob, `photo.${ext}`);
            formData.append("access_token", accessToken);
            formData.append("published", "false");
            formData.append("scheduled_publish_time", String(scheduledTime));
            if (caption) {
              formData.append("caption", caption);
            }

            const containerResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
              {
                method: "POST",
                body: formData,
              }
            );

            const containerData = await containerResponse.json();

            if (containerData.error) {
              return new Response(
                JSON.stringify({ error: containerData.error.message, code: containerData.error.code }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                postId: containerData.id,
                scheduledPublishTime: new Date(scheduledTime * 1000).toISOString(),
                message: "Post scheduled on Instagram successfully",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          } else if (imageUrl) {
            containerParams.image_url = imageUrl;
            if (caption) {
              containerParams.caption = caption;
            }

            const containerResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(containerParams),
              }
            );

            const containerData = await containerResponse.json();

            if (containerData.error) {
              return new Response(
                JSON.stringify({ error: containerData.error.message, code: containerData.error.code }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                postId: containerData.id,
                scheduledPublishTime: new Date(scheduledTime * 1000).toISOString(),
                message: "Post scheduled on Instagram successfully",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          } else {
            if (caption) {
              containerParams.caption = caption;
            }

            const containerResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(containerParams),
              }
            );

            const containerData = await containerResponse.json();

            if (containerData.error) {
              return new Response(
                JSON.stringify({ error: containerData.error.message, code: containerData.error.code }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                postId: containerData.id,
                scheduledPublishTime: new Date(scheduledTime * 1000).toISOString(),
                message: "Post scheduled on Instagram successfully",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
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
