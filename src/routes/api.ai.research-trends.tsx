import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media trend researcher. Based on your knowledge, provide relevant trends for content creation.

Current date: {date}
Country/Location: {country}
Platform: {platform}
Brand niche: {niche}

Provide:
1. What holidays, events, or cultural moments are happening around this date in this country?
2. What trending topics relate to this brand's niche?
3. What viral content patterns are popular right now on this platform?
4. What emotional triggers would make this content shareable?
5. What hashtags are currently trending in this niche?

Be specific. Reference actual events, real trending topics, and proven viral patterns.

Output ONLY a valid JSON object:
{"date_events":["event1","event2"],"trending_topics":["topic1","topic2"],"viral_patterns":["pattern1","pattern2"],"emotional_triggers":["trigger1","trigger2"],"trending_hashtags":["tag1","tag2"],"content_angle_suggestion":"specific suggestion combining brand and trends"}`;

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

export const Route = createFileRoute("/api/ai/research-trends" as any)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            date = new Date().toISOString().slice(0, 10),
            country = "Indonesia",
            platform = "Instagram",
            brand_niche = "",
          } = body;

          const apiKey = (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const prompt = SYSTEM_PROMPT
            .replace("{date}", date)
            .replace("{country}", country)
            .replace("{platform}", platform)
            .replace("{niche}", brand_niche || "general business");

          const content = await callGemini(apiKey, prompt, 2048);
          const parsed = extractJson(content);

          if (parsed) {
            return new Response(
              JSON.stringify({
                success: true,
                date_events: (parsed as Record<string, unknown>)["date_events"] || [],
                trending_topics: (parsed as Record<string, unknown>)["trending_topics"] || [],
                viral_patterns: (parsed as Record<string, unknown>)["viral_patterns"] || [],
                emotional_triggers: (parsed as Record<string, unknown>)["emotional_triggers"] || [],
                trending_hashtags: (parsed as Record<string, unknown>)["trending_hashtags"] || [],
                content_angle_suggestion: (parsed as Record<string, unknown>)["content_angle_suggestion"] || "",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              date_events: [],
              trending_topics: [],
              viral_patterns: [],
              emotional_triggers: [],
              trending_hashtags: [],
              content_angle_suggestion: "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: true,
              date_events: [],
              trending_topics: [],
              viral_patterns: [],
              emotional_triggers: [],
              trending_hashtags: [],
              content_angle_suggestion: "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
