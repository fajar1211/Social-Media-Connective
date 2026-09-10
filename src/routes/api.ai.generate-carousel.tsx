import { createFileRoute } from "@tanstack/react-router";

const POLLINATIONS_API_URL = "https://gen.pollinations.ai/v1/images/generations";

const STYLE_SUFFIXES: Record<string, string> = {
  photorealistic: ", photorealistic, high quality, professional photography, 4K",
  artistic: ", artistic, creative, vibrant colors, illustration style",
  minimal: ", minimalist, clean, simple, modern design",
  elegant: ", elegant, luxury, premium feel, soft lighting",
  bold: ", bold, eye-catching, strong colors, dynamic composition",
  natural: ", natural lighting, organic, authentic, real life",
};

function buildEnhancedPrompt(userPrompt: string, style: string): string {
  const parts = [userPrompt.trim()];
  const styleSuffix = STYLE_SUFFIXES[style] || "";
  if (styleSuffix) {
    parts.push(styleSuffix.trim());
  }
  return parts.join(", ");
}

async function generateImageWithPollinations(
  prompt: string,
  apiKey: string,
  size: string = "1024x1024"
): Promise<string | null> {
  const resp = await fetch(POLLINATIONS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "flux",
      prompt,
      size,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[generateImageWithPollinations] API error:", resp.status, errText.slice(0, 500));
    return null;
  }

  const data = await resp.json();

  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }

  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }

  return null;
}

export const Route = createFileRoute("/api/ai/generate-carousel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            prompts,
            style = "photorealistic",
          } = body;

          if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return new Response(
              JSON.stringify({
                error: "Missing required field: prompts (array of strings)",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const pollinationsKey = import.meta.env['VITE_POLLINATIONS_API_KEY'] || "sk_g9JZpQqFqFM99Uq3VesDuVe3wx1YQkZL";

          const images = [];
          for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            const enhancedPrompt = buildEnhancedPrompt(prompt, style);

            const imageUrl = await generateImageWithPollinations(enhancedPrompt, pollinationsKey, "1024x1024");

            if (imageUrl) {
              images.push({
                index: i,
                prompt,
                enhanced_prompt: enhancedPrompt,
                image_url: imageUrl,
              });
            } else {
              images.push({
                index: i,
                prompt,
                enhanced_prompt: enhancedPrompt,
                image_url: null,
                error: "Failed to generate this image",
              });
            }
          }

          return new Response(
            JSON.stringify({ success: true, images }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
