import { createFileRoute } from "@tanstack/react-router";

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const GEMINI_IMAGE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

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

async function generateImageWithGemini(
  prompt: string,
  apiKey: string,
  aspectRatio: string = "1:1"
): Promise<{ imageData: string; mimeType: string } | null> {
  const url = `${GEMINI_IMAGE_ENDPOINT}?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        responseFormat: {
          image: {
            aspectRatio,
            imageSize: "1K",
          },
        },
      },
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    console.error("[generateImageWithGemini] API error:", resp.status, JSON.stringify(errData.error || errData).slice(0, 500));
    return null;
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
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

          const geminiKey = import.meta.env['VITE_GEMINI_API_KEY'] || "";
          if (!geminiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const images = [];
          for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            const enhancedPrompt = buildEnhancedPrompt(prompt, style);

            const result = await generateImageWithGemini(enhancedPrompt, geminiKey, "1:1");

            if (result) {
              const imageDataUrl = `data:${result.mimeType};base64,${result.imageData}`;
              images.push({
                index: i,
                prompt,
                enhanced_prompt: enhancedPrompt,
                image_url: imageDataUrl,
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
