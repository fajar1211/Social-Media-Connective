import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media hashtag and CTA expert.

Generate hashtags and a call-to-action for this social media post.

Rules:
- Hashtags: 3-5 for Instagram, 1-2 for Facebook, 1-2 for Twitter
- Include 1-2 trending hashtags if provided
- Include 2-3 brand-specific hashtags (using actual brand name)
- Include 1-2 niche hashtags
- NO generic tags like ForYou, love, instagood
- WITHOUT # symbol in the array
- CTA: One compelling sentence telling readers what to do next
- CTA should match the content angle and emotional hook

Output ONLY a valid JSON object:
{"hashtags":["tag1","tag2","tag3"],"cta":"one compelling call to action"}`;

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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
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

export const Route = createFileRoute("/api/ai/generate-hashtags")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            caption = "",
            brand_name = "",
            platform = "Facebook",
            trending_tags = [],
            emotional_hook = "",
          } = body;

          const apiKey = (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const trendingText = trending_tags.length > 0
            ? `Trending hashtags to consider: ${trending_tags.join(", ")}`
            : "No trending hashtags available.";

          const prompt = [
            SYSTEM_PROMPT,
            "",
            `Caption: ${caption}`,
            `Brand name: ${brand_name}`,
            `Platform: ${platform}`,
            trendingText,
            emotional_hook ? `Emotional hook: ${emotional_hook}` : "",
            "",
            "Generate relevant hashtags and a compelling CTA.",
          ].filter(Boolean).join("\n");

          const content = await callGemini(apiKey, prompt, 1024);
          const parsed = extractJson(content);

          if (parsed && Array.isArray((parsed as Record<string, unknown>)["hashtags"])) {
            const tags = (parsed as Record<string, unknown>)["hashtags"] as string[];
            return new Response(
              JSON.stringify({
                success: true,
                hashtags: tags.map((t: string) => t.replace(/^#/, "")),
                cta: (parsed as Record<string, unknown>)["cta"] || "",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ error: "Failed to generate hashtags" }),
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
