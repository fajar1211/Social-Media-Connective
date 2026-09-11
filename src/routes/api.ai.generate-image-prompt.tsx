import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a visual designer specializing in social media content. Your job is to create a structured image prompt for AI image generation that avoids "AI slop" aesthetics.

Based on the caption and brand information, create a detailed image prompt using this EXACT 11-section structure:

1. FORMAT - Specify dimensions (9:16 vertical, 1:1 square, 16:9 horizontal)
2. PURPOSE - What is this poster for? (promo, awareness, travel, product, event)
3. MAIN FOCUS - ONE hero visual element. Not everything at once.
4. VISUAL HIERARCHY - What the eye sees first, second, third (numbered list)
5. COMPOSITION - Where elements are placed, negative space, layout rules
6. CAMERA/ANGLE - Specific angle (eye level, low angle, top-down, close-up, wide shot)
7. LIGHTING - Specific lighting (soft natural, overcast, golden hour, studio)
8. COLOR PALETTE - Specific colors, NOT "vibrant" or "beautiful". Limit saturation.
9. TEXT - What text appears on image (max 2-3 lines). No extra captions, badges, micro-text.
10. REALISM - Natural textures, believable proportions, no CGI look
11. NEGATIVE CONSTRAINTS - Always include: no excessive glow, no oversaturated colors, no random particles, no unnecessary lens flare, no overcrowded layout, no hyper-detailed fantasy lighting, no random objects added to empty space

RULES:
- Never use vague words like "beautiful", "amazing", "stunning", "cinematic" without specifics
- Always specify ONE main focus, not multiple competing elements
- Always include negative constraints to prevent AI slop
- Text on image should be minimal (1-2 lines maximum)
- Color palette should be 3-5 specific colors, not "colorful" or "vibrant"

Output ONLY a valid JSON object:
{"image_prompt":"the complete 11-section structured prompt here"}`;

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const realPart = parts.find((p: { thought?: boolean }) => !p.thought);
  return realPart?.text?.trim() || "";
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/ai/generate-image-prompt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            caption = "",
            brand_name = "",
            key_points = [],
            viral_patterns = [],
          } = body;

          const apiKey = (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const viralText = viral_patterns.length > 0
            ? `Trending visual styles: ${viral_patterns.join(", ")}`
            : "No viral patterns available.";

          const prompt = [
            SYSTEM_PROMPT,
            "",
            `Caption: ${caption}`,
            `Brand name: ${brand_name}`,
            `Key points: ${key_points.join(", ")}`,
            viralText,
            "",
            "Create a structured 11-section image prompt for this content.",
            "Follow the format exactly: FORMAT, PURPOSE, MAIN FOCUS, VISUAL HIERARCHY, COMPOSITION, CAMERA/ANGLE, LIGHTING, COLOR PALETTE, TEXT, REALISM, NEGATIVE CONSTRAINTS.",
          ].filter(Boolean).join("\n");

          const content = await callGemini(apiKey, prompt, 1024);
          const parsed = extractJson(content);

          if (parsed && typeof (parsed as Record<string, unknown>)["image_prompt"] === "string" && ((parsed as Record<string, unknown>)["image_prompt"] as string).length >= 20) {
            return new Response(
              JSON.stringify({
                success: true,
                image_prompt: (parsed as Record<string, unknown>)["image_prompt"],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ error: "Failed to generate image prompt" }),
            { status: 422, headers: { "Content-Type": "application/json" } }
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
