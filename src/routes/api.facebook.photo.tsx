import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/facebook/photo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { pageId, pageAccessToken, message, imageUrl } = body;

          if (!pageId || !pageAccessToken || !imageUrl) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: pageId, pageAccessToken, imageUrl" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const params: Record<string, string> = {
            url: imageUrl,
            access_token: pageAccessToken,
          };

          if (message) {
            params["caption"] = message;
          }

          const fbResponse = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/photos`,
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
              message: "Photo published successfully",
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
