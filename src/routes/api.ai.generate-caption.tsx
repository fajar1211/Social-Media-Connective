import { createFileRoute } from "@tanstack/react-router";
import { generatePost } from "@/lib/ai-agents";

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

          const result = await generatePost({
            topic: topic.trim(),
            platform,
            tone,
            knowledge: knowledgeBlocks,
            client_name,
            variety,
            goal: selectedGoal,
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
