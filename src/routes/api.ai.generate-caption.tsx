import { createFileRoute } from "@tanstack/react-router";
import { analyzeTrendsAndStrategy, generateContent } from "@/lib/ai-agents";

const GOALS = ["Education", "Promotion", "Engagement", "Awareness", "Announcement"];

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
            goal = "",
          } = body;

          if (!topic || !topic.trim()) {
            return new Response(
              JSON.stringify({ error: "Missing required field: topic" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const selectedGoal = goal || GOALS[Math.floor(Math.random() * GOALS.length)];

          const knowledgeBlocks: string[] = [];
          for (const kf of knowledge_files) {
            if (kf.content?.trim()) {
              knowledgeBlocks.push(`[${kf.name}]:\n${kf.content.trim()}`);
            }
          }

          // ── Agent 1: Trend Research + Strategy (~25s) ──
          console.log("[generate-caption] Starting trend analysis...");
          const strategy = await analyzeTrendsAndStrategy({
            topic: topic.trim(),
            platform,
            knowledge: knowledgeBlocks,
            client_name,
            goal: selectedGoal,
          });
          console.log("[generate-caption] Trend analysis result:", strategy ? "OK" : "NULL");

          if (!strategy) {
            return new Response(
              JSON.stringify({ error: "Failed to analyze trends and strategy" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── Agent 2: Content Generation (~25s) ──
          const result = await generateContent({
            topic: topic.trim(),
            platform,
            tone,
            knowledge: knowledgeBlocks,
            client_name,
            variety,
            strategy,
          });

          if (!result) {
            return new Response(
              JSON.stringify({ error: "Failed to generate content" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          return new Response(
            JSON.stringify({
              success: true,
              ...result,
              goal: selectedGoal,
              _elapsed: `${elapsed}s`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error("[generate-caption] Error:", err);
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
