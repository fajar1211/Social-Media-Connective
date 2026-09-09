import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media caption writer. Write ONE engaging, specific caption.

Your caption MUST:
- Reference the brand_name and specific key_points from the strategy
- Use the emotional_hook to open with impact
- Incorporate viral_elements naturally
- Follow the trend_integration suggestion
- Match the brand_voice
- Feel timely (reference current events if relevant)

Platform rules:
- Instagram: 100-2200 chars. Storytelling. Personal. Engaging. Natural emojis.
- Facebook: 100-500 chars. Conversational. Community-focused. Warm.
- Twitter: Under 280 chars. Punchy. Direct.

DO NOT:
- Write generic content that could be any brand
- Include hashtags in the caption
- Include CTA in the caption
- Use the client ID as the brand name

Output ONLY a valid JSON object:
{"caption":"the caption text here"}`;

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

export const Route = createFileRoute("/api/ai/write-caption" as any)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            strategy = {},
            knowledge = [],
            platform = "Facebook",
            tone = "professional",
            variety = "",
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

          const strategyText = strategy.brand_name
            ? `Brand: ${strategy.brand_name}. Key points: ${(strategy.key_points || []).join(", ")}. Voice: ${strategy.brand_voice || tone}. Audience: ${strategy.target_audience || ""}. Hook: ${strategy.emotional_hook || ""}. Angle: ${strategy.content_angle || ""}. Trend integration: ${strategy.trend_integration || ""}. Viral elements: ${(strategy.viral_elements || []).join(", ")}.`
            : "No strategy provided.";

          const prompt = [
            SYSTEM_PROMPT,
            "",
            "STRATEGY:",
            strategyText,
            "",
            "KNOWLEDGE CONTEXT:",
            knowledgeText,
            "",
            `Platform: ${platform}`,
            `Tone: ${tone}`,
            variety ? `Post style: ${variety}` : "",
            "",
            `Write a ${platform} caption using the strategy and knowledge above.`,
          ].filter(Boolean).join("\n");

          const content = await callGemini(apiKey, prompt, 2048);
          const parsed = extractJson(content);

          if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string" && ((parsed as Record<string, unknown>)["caption"] as string).length >= 20) {
            return new Response(
              JSON.stringify({
                success: true,
                caption: (parsed as Record<string, unknown>)["caption"],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ error: "Failed to generate caption" }),
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
