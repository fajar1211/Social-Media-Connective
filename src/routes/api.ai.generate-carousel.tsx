import { createFileRoute } from "@tanstack/react-router";

const POLLINATIONS_API_URL = "https://gen.pollinations.ai/v1/images/generations";

const STYLE_SUFFIXES: Record<string, string> = {
  photorealistic: "eye level product photography, soft natural morning light, realistic textures",
  artistic: "creative angle, artistic lighting, illustration style",
  minimal: "clean composition, minimal elements, modern design",
  elegant: "luxury angle, premium feel, soft studio lighting",
  bold: "dynamic angle, strong colors, bold composition",
  natural: "natural angle, organic lighting, authentic feel",
};

const NEGATIVE_CONSTRAINTS = "no excessive glow, no oversaturated colors, no random particles, no unnecessary lens flare, no overcrowded layout, no hyper-detailed fantasy lighting, no random objects added to empty space, no cluttered background";

// Agent 2: Prompt Architect - builds 11-section structured prompt for carousel
async function buildStructuredPrompt(
  userPrompt: string,
  style: string,
  apiKey: string,
  slideIndex: number,
  totalSlides: number
): Promise<string> {
  const model = "gemma-4-26b-a4b-it";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
You are a visual designer. Create an image prompt for carousel slide ${slideIndex + 1} of ${totalSlides} using EXACTLY this 11-section format.

Fill in each section based on the user's caption.

FORMAT: 9:16 vertical poster
PURPOSE: [what is this poster for]
MAIN FOCUS: [ONE hero visual element]
VISUAL HIERARCHY:
1. [first thing eye sees]
2. [second]
3. [third]
COMPOSITION: [where elements are placed, negative space]
CAMERA/ANGLE: [specific angle: ${STYLE_SUFFIXES[style] || STYLE_SUFFIXES["photorealistic"]}]
LIGHTING: [specific lighting]
COLOR PALETTE: [3-5 specific colors, NOT "vibrant"]
TEXT: [text on image, max 2 lines]
REALISM: [natural textures, believable proportions]
NEGATIVE CONSTRAINTS: ${NEGATIVE_CONSTRAINTS}

RULES:
- Never use "beautiful", "amazing", "stunning" without specifics
- ONE main focus only
- 3-5 specific colors
- Text max 2 lines
- Always include negative constraints
- This is slide ${slideIndex + 1} of ${totalSlides} in a carousel

Caption: ${userPrompt}

Output ONLY valid JSON:
{"image_prompt":"the 11-section prompt with all sections filled in"}
`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
    }),
  });

  const data = await resp.json();
  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  const realPart = responseParts.find((p: { thought?: boolean }) => !p.thought);
  const text = realPart?.text?.trim() || "";

  // Extract JSON from response
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return userPrompt;

  try {
    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as { image_prompt?: string };
    return parsed.image_prompt || userPrompt;
  } catch {
    return userPrompt;
  }
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
          const geminiKey = import.meta.env['VITE_GEMINI_API_KEY'] || "";

          const images = [];
          for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];

            // Agent 2: Prompt Architect (always runs for each slide)
            let enhancedPrompt: string;
            if (geminiKey) {
              console.log(`[generate-carousel] Agent 2: Building structured prompt for slide ${i + 1}/${prompts.length}...`);
              enhancedPrompt = await buildStructuredPrompt(prompt, style, geminiKey, i, prompts.length);
            } else {
              // Fallback: use simple concatenation if no Gemini key
              enhancedPrompt = `${prompt.trim()}, ${STYLE_SUFFIXES[style] || STYLE_SUFFIXES["photorealistic"]}, ${NEGATIVE_CONSTRAINTS}`;
            }

            console.log(`[generate-carousel] Slide ${i + 1} prompt:`, enhancedPrompt.slice(0, 100));

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
