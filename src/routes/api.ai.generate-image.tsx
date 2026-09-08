import { createFileRoute } from "@tanstack/react-router";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const STYLE_SUFFIXES: Record<string, string> = {
  photorealistic: ", photorealistic, high quality, professional photography, 4K",
  artistic: ", artistic, creative, vibrant colors, illustration style",
  minimal: ", minimalist, clean, simple, modern design",
  elegant: ", elegant, luxury, premium feel, soft lighting",
  bold: ", bold, eye-catching, strong colors, dynamic composition",
  natural: ", natural lighting, organic, authentic, real life",
};

function buildEnhancedPrompt(
  userPrompt: string,
  referenceDesc: string,
  style: string
): string {
  const parts = [userPrompt.trim()];
  if (referenceDesc) {
    parts.push(`Style reference: ${referenceDesc.trim()}`);
  }
  const styleSuffix = STYLE_SUFFIXES[style] || "";
  if (styleSuffix) {
    parts.push(styleSuffix.trim());
  }
  return parts.join(", ");
}

function buildPollinationsUrl(
  prompt: string,
  width: number,
  height: number,
  seed: number,
  model: string
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  return `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
}

async function describeWithGemini(
  imageData: string,
  apiKey: string
): Promise<string> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let parts: Array<Record<string, unknown>>;

  if (imageData.startsWith("http")) {
    parts = [
      {
        text: "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text.",
      },
      { file_data: { file_uri: imageData } },
    ];
  } else {
    let cleanB64 = imageData;
    if (imageData.includes(",")) {
      cleanB64 = imageData.split(",")[1];
    }
    parts = [
      {
        text: "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text.",
      },
      { inline_data: { mime_type: "image/jpeg", data: cleanB64 } },
    ];
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  });

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

export const Route = createFileRoute("/api/ai/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            prompt,
            reference_image = "",
            gbp_url = "",
            width = 1024,
            height = 1024,
            style = "photorealistic",
            model = "flux",
          } = body;

          if (!prompt) {
            return new Response(
              JSON.stringify({ error: "Missing required field: prompt" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          let referenceDesc = "";
          const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

          if (gbp_url && geminiKey) {
            referenceDesc = await describeWithGemini(gbp_url, geminiKey);
          } else if (reference_image && geminiKey) {
            referenceDesc = await describeWithGemini(reference_image, geminiKey);
          }

          const enhancedPrompt = buildEnhancedPrompt(
            prompt,
            referenceDesc,
            style
          );
          const seed = Math.floor(Math.random() * 999999) + 1;
          const imageUrl = buildPollinationsUrl(
            enhancedPrompt,
            width,
            height,
            seed,
            model
          );

          return new Response(
            JSON.stringify({
              success: true,
              image_url: imageUrl,
              seed,
              enhanced_prompt: enhancedPrompt,
              reference_description: referenceDesc,
            }),
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
