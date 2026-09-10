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
      cleanB64 = imageData.split(",")[1] || imageData;
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
  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  const realPart = responseParts.find((p: { thought?: boolean }) => !p.thought);
  return realPart?.text?.trim() || "";
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
            style = "photorealistic",
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

          const geminiKey = import.meta.env['VITE_GEMINI_API_KEY'] || "";
          if (!geminiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          let referenceDesc = "";

          if (gbp_url) {
            referenceDesc = await describeWithGemini(gbp_url, geminiKey);
          } else if (reference_image) {
            referenceDesc = await describeWithGemini(reference_image, geminiKey);
          }

          const enhancedPrompt = buildEnhancedPrompt(prompt, referenceDesc, style);

          const result = await generateImageWithGemini(enhancedPrompt, geminiKey, "1:1");

          if (!result) {
            return new Response(
              JSON.stringify({ error: "Failed to generate image. Please try again." }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }

          const imageDataUrl = `data:${result.mimeType};base64,${result.imageData}`;

          return new Response(
            JSON.stringify({
              success: true,
              image_url: imageDataUrl,
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
