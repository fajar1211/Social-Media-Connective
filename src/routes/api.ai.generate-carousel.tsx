import { createFileRoute } from "@tanstack/react-router";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const STYLE_SUFFIXES: Record<string, string> = {
  photorealistic: ", photorealistic, high quality, professional photography, 4K",
  artistic: ", artistic, creative, vibrant colors, illustration style",
  minimal: ", minimalist, clean, simple, modern design",
  elegant: ", elegant, luxury, premium feel, soft lighting",
  bold: ", bold, eye-catching, strong colors, dynamic composition",
  natural: ", natural lighting, organic, authentic, real life",
};

function buildEnhancedPrompt(userPrompt: string, style: string): string {
  const parts = [userPrompt.trim()];
  const styleSuffix = STYLE_SUFFIXES[style] || "";
  if (styleSuffix) {
    parts.push(styleSuffix.trim());
  }
  return parts.join(", ");
}

function buildPollinationsUrl(
  prompt: string,
  width: number,
  height: number,
  seed: number,
  model: string
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  return `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
}

export const Route = createFileRoute("/api/ai/generate-carousel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            prompts,
            width = 1024,
            height = 1024,
            style = "photorealistic",
            model = "flux",
          } = body;

          if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return new Response(
              JSON.stringify({
                error: "Missing required field: prompts (array of strings)",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const images = prompts.map(
            (prompt: string, index: number) => {
              const enhancedPrompt = buildEnhancedPrompt(prompt, style);
              const seed = Math.floor(Math.random() * 999999) + 1;
              const imageUrl = buildPollinationsUrl(
                enhancedPrompt,
                width,
                height,
                seed,
                model
              );
              return {
                index,
                prompt,
                enhanced_prompt: enhancedPrompt,
                image_url: imageUrl,
                seed,
              };
            }
          );

          return new Response(
            JSON.stringify({ success: true, images }),
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
