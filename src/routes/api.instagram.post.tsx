import { createFileRoute } from "@tanstack/react-router";

const GRAPH_API_VERSION = "v21.0";

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !match[1] || !match[2]) return null;
  const mimeType: string = match[1];
  const base64Data: string = match[2];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mimeType }), ext: mimeType.split("/")[1] || "jpg" };
}

async function fetchImageAsBlob(url: string): Promise<{ blob: Blob; ext: string } | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "SocialMediaConnective/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const contentType = resp.headers.get("content-type") || blob.type || "image/jpeg";
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    return { blob, ext };
  } catch (err) {
    console.error("[InstagramPost] Failed to fetch image from URL:", url, err);
    return null;
  }
}

async function uploadImageToInstagram(
  igUserId: string,
  accessToken: string,
  imageBlob: Blob,
  ext: string,
  caption?: string
): Promise<string | null> {
  const formData = new FormData();
  formData.append("source", imageBlob, `photo.${ext}`);
  formData.append("access_token", accessToken);
  if (caption) {
    formData.append("caption", caption);
  }

  console.log("[InstagramPost] Uploading to Instagram:", {
    igUserId,
    blobSize: imageBlob.size,
    blobType: imageBlob.type,
    ext,
    hasCaption: !!caption,
  });

  const containerResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`,
    { method: "POST", body: formData }
  );

  const containerData = await containerResponse.json();
  console.log("[InstagramPost] Instagram /media response:", JSON.stringify(containerData));
  if (containerData.error) {
    console.error("[InstagramPost] Instagram API error:", containerData.error);
    return null;
  }
  return containerData.id;
}

export const Route = createFileRoute("/api/instagram/post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { igUserId, accessToken, imageUrl, caption } = body;

          console.log("[InstagramPost] Received request:", {
            igUserId: igUserId ? `${igUserId.substring(0, 8)}...` : "MISSING",
            accessToken: accessToken ? "present" : "MISSING",
            imageUrl: imageUrl ? `${imageUrl.substring(0, 80)}...` : "EMPTY/MISSING",
            caption: caption ? `${caption.substring(0, 50)}...` : "none",
            imageUrlType: imageUrl ? (imageUrl.startsWith("data:") ? "data-url" : imageUrl.startsWith("blob:") ? "blob-url" : imageUrl.startsWith("http") ? "http-url" : "unknown") : "none",
          });

          if (!igUserId || !accessToken) {
            console.error("[InstagramPost] Missing igUserId or accessToken");
            return new Response(
              JSON.stringify({ error: "Missing required fields: igUserId, accessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (!imageUrl) {
            console.error("[InstagramPost] imageUrl is empty/missing");
            return new Response(
              JSON.stringify({ error: "Image URL is required for Instagram posts. Please upload an image before publishing." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (imageUrl.startsWith("blob:")) {
            return new Response(
              JSON.stringify({ error: "Blob URLs cannot be used for publishing. Please upload the image first." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          let containerId: string | null = null;

          if (imageUrl.startsWith("data:")) {
            console.log("[InstagramPost] Processing data URL");
            const result = dataUrlToBlob(imageUrl);
            if (!result) {
              console.error("[InstagramPost] Failed to parse data URL");
              return new Response(
                JSON.stringify({ error: "Invalid data URL format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }
            console.log("[InstagramPost] Data URL parsed, blob size:", result.blob.size, "ext:", result.ext);
            containerId = await uploadImageToInstagram(igUserId, accessToken, result.blob, result.ext, caption);
          } else {
            console.log("[InstagramPost] Fetching image from URL:", imageUrl.substring(0, 100));
            const result = await fetchImageAsBlob(imageUrl);
            if (!result) {
              console.error("[InstagramPost] Failed to fetch image from URL:", imageUrl.substring(0, 100));
              return new Response(
                JSON.stringify({ error: "Failed to fetch image from the provided URL. The image may be temporarily unavailable. Please try downloading and re-uploading the image." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }
            console.log("[InstagramPost] Image fetched, blob size:", result.blob.size, "ext:", result.ext);
            containerId = await uploadImageToInstagram(igUserId, accessToken, result.blob, result.ext, caption);
          }

          console.log("[InstagramPost] Container ID:", containerId);

          if (!containerId) {
            console.error("[InstagramPost] Failed to create container");
            return new Response(
              JSON.stringify({ error: "Failed to create Instagram media container. Please try again." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
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
