import { createFileRoute } from "@tanstack/react-router";

const GRAPH_API_VERSION = "v21.0";

export const Route = createFileRoute("/api/instagram/post" as any)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { igUserId, accessToken, imageUrl, caption } = body;

          if (!igUserId || !accessToken) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: igUserId, accessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          let containerId: string;

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

            containerId = containerData.id;
          } else if (imageUrl) {
            const containerParams: Record<string, string> = {
              image_url: imageUrl,
              access_token: accessToken,
            };
            if (caption) {
              containerParams['caption'] = caption;
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

            containerId = containerData.id;
          } else {
            const textParams: Record<string, string> = {
              access_token: accessToken,
            };
            if (caption) {
              textParams['caption'] = caption;
            }

            const containerResponse = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(textParams),
              }
            );

            const containerData = await containerResponse.json();

            if (containerData.error) {
              return new Response(
                JSON.stringify({ error: containerData.error.message, code: containerData.error.code }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            containerId = containerData.id;
          }

          const publishResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerId,
                access_token: accessToken,
              }),
            }
          );

          const publishData = await publishResponse.json();

          if (publishData.error) {
            return new Response(
              JSON.stringify({ error: publishData.error.message, code: publishData.error.code }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              postId: publishData.id,
              message: "Post published to Instagram successfully",
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
