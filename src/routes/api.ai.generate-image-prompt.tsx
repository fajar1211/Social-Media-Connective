import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a visual designer specializing in social media content.

Create a detailed image prompt for AI image generation based on this caption.

The image prompt must:
- Visually represent the caption's message
- Incorporate trending visual styles if provided
- Be specific enough for AI to generate a high-quality image
- Include: subject, setting, lighting, mood, style, composition
- Reference brand-specific elements (location, products, style)

DO NOT:
- Be vague (like "a nice photo")
- Forget the brand's specific elements

Output ONLY a valid JSON object:
{"image_prompt":"detailed visual description for AI image generation"}`;

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

export const Route = createFileRoute("/api/ai/generate-image-prompt" as any)({
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
            "Create a detailed image prompt for this content.",
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
