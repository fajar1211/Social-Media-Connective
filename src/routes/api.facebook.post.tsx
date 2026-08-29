import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/facebook/post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { pageId, pageAccessToken, message, link } = body;

          if (!pageId || !pageAccessToken || !message) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: pageId, pageAccessToken, message" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const params: Record<string, string> = {
            message,
            access_token: pageAccessToken,
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
              message: "Post published successfully",
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
