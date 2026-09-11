import { createFileRoute } from "@tanstack/react-router";

const POLLINATIONS_API_URL = "https://gen.pollinations.ai/v1/images/generations";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] || "https://jzwmgcldazvuoxvbmkzu.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n";

const STYLE_SUFFIXES: Record<string, string> = {
  photorealistic: "eye level product photography, soft natural morning light, realistic textures",
  artistic: "creative angle, artistic lighting, illustration style",
  minimal: "clean composition, minimal elements, modern design",
  elegant: "luxury angle, premium feel, soft studio lighting",
  bold: "dynamic angle, strong colors, bold composition",
  natural: "natural angle, organic lighting, authentic feel",
};

const NEGATIVE_CONSTRAINTS = "no excessive glow, no oversaturated colors, no random particles, no unnecessary lens flare, no overcrowded layout, no hyper-detailed fantasy lighting, no random objects added to empty space, no cluttered background";

interface ReferenceAnalysis {
  composition: string;
  lighting: string;
  color_palette: string;
  camera_angle: string;
  mood: string;
  typography_style: string;
  elements_to_keep: string[];
  elements_to_remove: string[];
}

// Agent 1: Reference Analyst - analyzes reference image into structured design decisions
async function analyzeDesignReference(
  imageData: string,
  apiKey: string
): Promise<ReferenceAnalysis | null> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let parts: Array<Record<string, unknown>>;

  const analysisPrompt = `Analyze this reference image for design recreation. Output ONLY valid JSON with these keys:
{
  "composition": "how elements are arranged (e.g., hero product with clean sky area)",
  "lighting": "specific lighting style (e.g., soft natural afternoon light)",
  "color_palette": "3-5 specific colors (e.g., sage green, cream, soft beige)",
  "camera_angle": "specific angle (e.g., low-angle smartphone style)",
  "mood": "overall mood (e.g., premium, minimal, warm)",
  "typography_style": "text style if any (e.g., bold headline, minimal text)",
  "elements_to_keep": ["list", "of", "good", "elements"],
  "elements_to_remove": ["list", "of", "elements", "to", "avoid"]
}

Focus on design language, not content. Be specific.`;

  if (imageData.startsWith("http")) {
    parts = [
      { text: analysisPrompt },
      { file_data: { file_uri: imageData } },
    ];
  } else {
    let cleanB64 = imageData;
    if (imageData.includes(",")) {
      cleanB64 = imageData.split(",")[1] || imageData;
    }
    parts = [
      { text: analysisPrompt },
      { inline_data: { mime_type: "image/jpeg", data: cleanB64 } },
    ];
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
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
  if (firstBrace === -1 || lastBrace === -1) return null;

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as ReferenceAnalysis;
  } catch {
    return null;
  }
}

// Agent 2: Prompt Architect - builds 11-section structured prompt
async function buildStructuredPrompt(
  userPrompt: string,
  referenceAnalysis: ReferenceAnalysis | null,
  style: string,
  apiKey: string
): Promise<string> {
  const model = "gemma-4-26b-a4b-it";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let referenceSection = "";
  if (referenceAnalysis) {
    referenceSection = `
REFERENCE ANALYSIS (use for design language only, do NOT copy exactly):
- Composition: ${referenceAnalysis.composition}
- Lighting: ${referenceAnalysis.lighting}
- Color palette: ${referenceAnalysis.color_palette}
- Camera angle: ${referenceAnalysis.camera_angle}
- Mood: ${referenceAnalysis.mood}
- Elements to keep: ${referenceAnalysis.elements_to_keep.join(", ")}
- Elements to avoid: ${referenceAnalysis.elements_to_remove.join(", ")}

Apply the design language from the reference. Do NOT copy layout, text placement, or exact proportions.`;
  }

  const prompt = `
You are a visual designer. Create an image prompt using EXACTLY this 11-section format.

Fill in each section based on the user's caption and reference analysis.

FORMAT: 9:16 vertical poster
PURPOSE: [what is this poster for]
MAIN FOCUS: [ONE hero visual element]
VISUAL HIERARCHY:
1. [first thing eye sees]
2. [second]
3. [third]
COMPOSITION: [where elements are placed, negative space]
CAMERA/ANGLE: [specific angle from style: ${STYLE_SUFFIXES[style] || STYLE_SUFFIXES["photorealistic"]}]
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
${referenceSection}

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

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !match[1] || !match[2]) return null;
  const mimeType = match[1];
  const base64Data = match[2];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mimeType }), ext: mimeType.split("/")[1] || "png" };
}

async function uploadToSupabase(dataUrl: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const result = dataUrlToBlob(dataUrl);
  if (!result) return null;

  const path = `content/ai-generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${result.ext}`;
  const url = `${SUPABASE_URL}/storage/v1/object/media/${path}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": result.blob.type || "image/png",
      "x-upsert": "false",
    },
    body: result.blob,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[uploadToSupabase] Upload failed:", resp.status, errText.slice(0, 300));
    return null;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
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

          const pollinationsKey = import.meta.env['VITE_POLLINATIONS_API_KEY'] || "sk_g9JZpQqFqFM99Uq3VesDuVe3wx1YQkZL";
          const geminiKey = import.meta.env['VITE_GEMINI_API_KEY'] || "";

          // Agent 1: Reference Analyst (only if reference image provided)
          let referenceAnalysis: ReferenceAnalysis | null = null;

          if (gbp_url && geminiKey) {
            console.log("[generate-image] Agent 1: Analyzing GBP reference...");
            referenceAnalysis = await analyzeDesignReference(gbp_url, geminiKey);
          } else if (reference_image && geminiKey) {
            console.log("[generate-image] Agent 1: Analyzing reference image...");
            referenceAnalysis = await analyzeDesignReference(reference_image, geminiKey);
          }

          if (referenceAnalysis) {
            console.log("[generate-image] Reference analysis:", JSON.stringify(referenceAnalysis).slice(0, 200));
          }

          // Agent 2: Prompt Architect (always runs)
          let enhancedPrompt: string;
          if (geminiKey) {
            console.log("[generate-image] Agent 2: Building structured prompt...");
            enhancedPrompt = await buildStructuredPrompt(prompt, referenceAnalysis, style, geminiKey);
          } else {
            // Fallback: use simple concatenation if no Gemini key
            enhancedPrompt = `${prompt.trim()}, ${STYLE_SUFFIXES[style] || STYLE_SUFFIXES["photorealistic"]}, ${NEGATIVE_CONSTRAINTS}`;
          }

          console.log("[generate-image] Final prompt:", enhancedPrompt.slice(0, 200));

          // Generate image with Pollinations
          let imageUrl = await generateImageWithPollinations(enhancedPrompt, pollinationsKey, "1024x1024");

          if (!imageUrl) {
            return new Response(
              JSON.stringify({ error: "Failed to generate image. Please try again." }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }

          // If Pollinations returned a data URL, upload to Supabase for a public HTTP URL
          if (imageUrl.startsWith("data:")) {
            console.log("[generate-image] Pollinations returned data URL, uploading to Supabase...");
            const publicUrl = await uploadToSupabase(imageUrl);
            if (publicUrl) {
              console.log("[generate-image] Uploaded to Supabase:", publicUrl);
              imageUrl = publicUrl;
            } else {
              console.log("[generate-image] Supabase upload failed, returning data URL as fallback");
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              image_url: imageUrl,
              enhanced_prompt: enhancedPrompt,
              reference_analysis: referenceAnalysis,
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
