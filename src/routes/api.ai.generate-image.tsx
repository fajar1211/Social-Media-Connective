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

          const pollinationsKey = import.meta.env['VITE_POLLINATIONS_API_KEY'] || "";
          const geminiKey = import.meta.env['VITE_GEMINI_API_KEY'] || "";

          if (!pollinationsKey) {
            return new Response(
              JSON.stringify({ error: "Pollinations API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          let referenceDesc = "";

          if (gbp_url && geminiKey) {
            referenceDesc = await describeWithGemini(gbp_url, geminiKey);
          } else if (reference_image && geminiKey) {
            referenceDesc = await describeWithGemini(reference_image, geminiKey);
          }

          const enhancedPrompt = buildEnhancedPrompt(prompt, referenceDesc, style);

          const imageUrl = await generateImageWithPollinations(enhancedPrompt, pollinationsKey, "1024x1024");

          if (!imageUrl) {
            return new Response(
              JSON.stringify({ error: "Failed to generate image. Please try again." }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              image_url: imageUrl,
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
