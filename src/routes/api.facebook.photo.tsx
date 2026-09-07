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

          if (imageUrl.startsWith("data:")) {
            const formData = new FormData();

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
            formData.append("source", blob, `photo.${ext}`);
            formData.append("access_token", pageAccessToken);

            if (message) {
              formData.append("caption", message);
            }

            const fbResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/photos`,
              {
                method: "POST",
                body: formData,
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
          } else {
            const params: Record<string, string> = {
              url: imageUrl,
              access_token: pageAccessToken,
            };

            if (message) {
              params["caption"] = message;
            }

            const fbResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/photos`,
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
