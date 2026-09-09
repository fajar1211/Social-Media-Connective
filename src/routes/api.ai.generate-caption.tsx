import { createFileRoute } from "@tanstack/react-router";
import {
  runTrendsAgent,
  runStrategyAgent,
  runCaptionAgent,
  runHashtagAgent,
  runImagePromptAgent,
  type TrendData,
  type StrategyData,
} from "@/lib/ai-agents";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GOALS = ["Education", "Promotion", "Engagement", "Awareness", "Announcement"];

function getApiKey(): string {
  return (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
}

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
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { /* continue */ }
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* continue */ }
  }

  return null;
}

function extractBrandFromKnowledge(knowledge: string[]): string {
  for (const block of knowledge) {
    const match = block.match(/\[([^\]]+)\]/);
    if (match && match[1] && !match[1].includes("New Knowledge")) {
      return match[1];
    }
  }
  return "";
}

export const Route = createFileRoute("/api/ai/generate-caption")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();

        try {
          const body = await request.json();
          const {
            topic = "",
            platform = "Facebook",
            tone = "professional",
            client_name = "",
            knowledge_files = [],
            variety = "",
            reference_url = "",
            goal = "",
          } = body;

          if (!topic || !topic.trim()) {
            return new Response(
              JSON.stringify({ error: "Missing required field: topic" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const apiKey = getApiKey();
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const selectedGoal = goal || GOALS[Math.floor(Math.random() * GOALS.length)];

          const knowledgeBlocks: string[] = [];
          for (const kf of knowledge_files) {
            if (kf.content?.trim()) {
              knowledgeBlocks.push(`[${kf.name}]:\n${kf.content.trim()}`);
            }
          }

          const brandFromKnowledge = extractBrandFromKnowledge(knowledgeBlocks);
          const brandNiche = brandFromKnowledge || client_name || "general business";

          // ── Step 1: Trends (fast, 1 call) ──
          const trends: TrendData = await runTrendsAgent({
            date: new Date().toISOString().slice(0, 10),
            country: "Indonesia",
            platform,
            brand_niche: brandNiche,
          });

          // ── Step 2: Strategy (with retry) ──
          let strategy: StrategyData | null = await runStrategyAgent({
            knowledge: knowledgeBlocks,
            trends,
            topic: topic.trim(),
            goal: selectedGoal,
            reference: "",
          });

          // If strategy failed, create minimal strategy from knowledge
          if (!strategy && brandFromKnowledge) {
            strategy = {
              brand_name: brandFromKnowledge,
              key_points: [],
              target_audience: "",
              brand_voice: tone,
              emotional_hook: "",
              content_angle: topic.trim(),
              trend_integration: "",
              viral_elements: [],
            };
          }

          if (!strategy) {
            // Last resort: direct Gemini call
            const directPrompt = `Write a ${platform} post about "${topic.trim()}" for ${client_name}. Output JSON: {"topic":"...","caption":"...","hashtags":[...],"cta":"...","image_prompt":"..."}`;
            try {
              const content = await callGemini(apiKey, directPrompt, 2048);
              const parsed = extractJson(content);
              if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string") {
                const p = parsed as Record<string, unknown>;
                return new Response(
                  JSON.stringify({
                    success: true,
                    topic: (p["topic"] as string) || topic.trim().slice(0, 80),
                    caption: p["caption"],
                    hashtags: p["hashtags"] || [],
                    cta: p["cta"] || "",
                    image_prompt: p["image_prompt"] || "",
                    content_type: "Image",
                    goal: selectedGoal,
                  }),
                  { status: 200, headers: { "Content-Type": "application/json" } }
                );
              }
            } catch { /* fallback failed too */ }

            return new Response(
              JSON.stringify({ error: "Failed to generate content strategy" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── Step 3: Caption (with retry) ──
          const caption = await runCaptionAgent({
            strategy,
            knowledge: knowledgeBlocks,
            platform,
            tone,
            variety,
          });

          if (!caption) {
            // Fallback: direct Gemini call
            const directPrompt = `Write a ${platform} social media post about ${strategy.brand_name}: ${topic.trim()}. Goal: ${selectedGoal}. Tone: ${tone}. Output JSON: {"topic":"...","caption":"...","hashtags":[...],"cta":"...","image_prompt":"..."}`;
            try {
              const content = await callGemini(apiKey, directPrompt, 2048);
              const parsed = extractJson(content);
              if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string") {
                const p = parsed as Record<string, unknown>;
                return new Response(
                  JSON.stringify({
                    success: true,
                    topic: (p["topic"] as string) || `${strategy!.brand_name}: ${topic.trim()}`.slice(0, 80),
                    caption: p["caption"],
                    hashtags: p["hashtags"] || [],
                    cta: p["cta"] || "",
                    image_prompt: p["image_prompt"] || "",
                    content_type: "Image",
                    goal: selectedGoal,
                  }),
                  { status: 200, headers: { "Content-Type": "application/json" } }
                );
              }
            } catch { /* fallback failed too */ }

            return new Response(
              JSON.stringify({ error: "Failed to generate caption" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── Step 4: Hashtags + Image (PARALLEL) ──
          const [hashtagResult, imageResult] = await Promise.all([
            runHashtagAgent({
              caption,
              brand_name: strategy.brand_name,
              platform,
              trending_tags: trends.trending_hashtags,
              emotional_hook: strategy.emotional_hook,
            }),
            runImagePromptAgent({
              caption,
              brand_name: strategy.brand_name,
              key_points: strategy.key_points,
              viral_patterns: trends.viral_patterns,
            }),
          ]);

          const topicTitle = strategy.brand_name
            ? `${strategy.brand_name}: ${strategy.content_angle || topic.trim()}`.slice(0, 80)
            : topic.trim().slice(0, 80);

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          return new Response(
            JSON.stringify({
              success: true,
              topic: topicTitle,
              caption,
              hashtags: hashtagResult.hashtags,
              cta: hashtagResult.cta,
              image_prompt: imageResult,
              content_type: "Image",
              goal: selectedGoal,
              _elapsed: `${elapsed}s`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
              _elapsed: `${elapsed}s`,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
