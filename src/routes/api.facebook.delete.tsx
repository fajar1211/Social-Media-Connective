import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/facebook/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { postId, pageAccessToken } = body;

          if (!postId || !pageAccessToken) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: postId, pageAccessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const fbResponse = await fetch(
            `https://graph.facebook.com/v21.0/${postId}`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: pageAccessToken,
              }),
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
              success: fbData.success,
              message: fbData.success ? "Post deleted successfully" : "Failed to delete post",
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
