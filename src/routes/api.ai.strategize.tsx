import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media content strategist. Create a detailed content plan.

You have two sources of truth:
1. KNOWLEDGE CONTEXT — Brand-specific details (name, products, location, values, audience)
2. TREND INSIGHTS — Current events, trending topics, viral patterns

Combine these into a content strategy that:
- References SPECIFIC brand details (not generic)
- Incorporates current trends naturally (not forced)
- Uses proven viral patterns
- Targets the right emotional hooks
- Feels timely and relevant

Output ONLY a valid JSON object:
{"brand_name":"exact brand name from knowledge","key_points":["specific point 1","specific point 2","specific point 3"],"target_audience":"who we are talking to","brand_voice":"how the brand speaks","emotional_hook":"the feeling we want to evoke","content_angle":"the unique perspective for this post","trend_integration":"how to naturally incorporate trending topics","viral_elements":["element1","element2"]}`;

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

export const Route = createFileRoute("/api/ai/strategize" as any)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            knowledge = [],
            trends = {},
            topic = "",
            goal = "",
            reference = "",
          } = body;

          const apiKey = (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const knowledgeText = knowledge.length > 0
            ? knowledge.map((k: string) => k).join("\n\n")
            : "No knowledge context provided.";

          const trendsText = trends.trending_topics?.length > 0
            ? `Trending topics: ${trends.trending_topics.join(", ")}. Viral patterns: ${trends.viral_patterns?.join(", ") || ""}. Emotional triggers: ${trends.emotional_triggers?.join(", ") || ""}. Suggested angle: ${trends.content_angle_suggestion || ""}`
            : "No trend data available.";

          const prompt = [
            SYSTEM_PROMPT,
            "",
            "KNOWLEDGE CONTEXT:",
            knowledgeText,
            "",
            "TREND INSIGHTS:",
            trendsText,
            "",
            `Topic: ${topic}`,
            `Goal: ${goal}`,
            reference ? `Reference: ${reference.slice(0, 500)}` : "",
            "",
            "Create a content strategy combining brand knowledge with current trends.",
          ].filter(Boolean).join("\n");

          const content = await callGemini(apiKey, prompt, 2048);
          const parsed = extractJson(content);

          if (parsed && (parsed as Record<string, unknown>)["brand_name"]) {
            const p = parsed as Record<string, unknown>;
            return new Response(
              JSON.stringify({
                success: true,
                brand_name: p["brand_name"],
                key_points: p["key_points"] || [],
                target_audience: p["target_audience"] || "",
                brand_voice: p["brand_voice"] || "",
                emotional_hook: p["emotional_hook"] || "",
                content_angle: p["content_angle"] || "",
                trend_integration: p["trend_integration"] || "",
                viral_elements: p["viral_elements"] || [],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ error: "Failed to generate strategy" }),
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
