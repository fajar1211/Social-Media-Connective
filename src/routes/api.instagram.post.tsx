import { createFileRoute } from "@tanstack/react-router";

const GRAPH_API_VERSION = "v21.0";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] || "https://jzwmgcldazvuoxvbmkzu.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n";

async function uploadBlobToSupabase(
  blob: Blob,
  ext: string
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[InstagramPost] Supabase not configured - missing URL or key");
    return null;
  }

  const path = `content/instagram-publish/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  console.log("[InstagramPost] Uploading to Supabase storage:", path, "blob size:", blob.size, "type:", blob.type);

  const url = `${SUPABASE_URL}/storage/v1/object/media/${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": blob.type || "image/jpeg",
      "x-upsert": "false",
    },
    body: blob,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[InstagramPost] Supabase upload failed:", resp.status, errText.slice(0, 300));
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
  console.log("[InstagramPost] Uploaded to Supabase:", publicUrl);
  return publicUrl;
}

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

async function resolveImageUrl(imageUrl: string): Promise<string> {
  // Already a public HTTP URL - use directly
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  // Data URL - upload to Supabase to get a public URL
  if (imageUrl.startsWith("data:")) {
    const result = dataUrlToBlob(imageUrl);
    if (!result) throw new Error("Invalid data URL format");

    console.log("[InstagramPost] Data URL detected, uploading to Supabase...");
    const publicUrl = await uploadBlobToSupabase(result.blob, result.ext);
    if (!publicUrl) {
      throw new Error("Failed to upload image to storage. Please check that the 'media' bucket exists in Supabase Storage and is set to public. You can create it in: Supabase Dashboard > Storage > New Bucket > Name: 'media' > Public: ON");
    }
    return publicUrl;
  }

  throw new Error("Unsupported image URL format. Please use an HTTP URL or re-upload the image.");
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
            imageUrlType: imageUrl
              ? imageUrl.startsWith("data:")
                ? "data-url"
                : imageUrl.startsWith("blob:")
                  ? "blob-url"
                  : imageUrl.startsWith("http")
                    ? "http-url"
                    : "unknown"
              : "none",
          });

          if (!igUserId || !accessToken) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: igUserId, accessToken" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (!imageUrl) {
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

          let publicImageUrl: string;
          try {
            publicImageUrl = await resolveImageUrl(imageUrl);
          } catch (err) {
            return new Response(
              JSON.stringify({ error: err instanceof Error ? err.message : "Failed to process image" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          console.log("[InstagramPost] Creating container with image_url:", publicImageUrl.substring(0, 120));

          const containerParams: Record<string, string> = {
            image_url: publicImageUrl,
            access_token: accessToken,
          };
          if (caption) {
            containerParams["caption"] = caption;
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
          console.log("[InstagramPost] Container response:", JSON.stringify(containerData));

          if (containerData.error) {
            return new Response(
              JSON.stringify({ error: containerData.error.message, code: containerData.error.code }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const containerId = containerData.id;

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
