import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media content expert. Generate engaging social media posts.
You MUST respond with valid JSON only. No markdown, no code blocks, no extra text.

The JSON must have this exact structure:
{
  "caption": "The post caption text",
  "hashtags": ["tag1", "tag2", "tag3"]
}

Rules:
- caption: concise, engaging, platform-appropriate (max 2200 chars for Instagram, 280 for Twitter)
- hashtags: array of relevant hashtags WITHOUT the # symbol (3-15 tags)
- Match the tone requested
- Include a call-to-action when appropriate
- Do NOT include hashtags in the caption text itself, return them separately`;

function parseJsonResponse(text: string): { caption?: string; hashtags?: string[] } | null {
  // Strategy 1: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* continue */ }
  }

  // Strategy 2: Raw json.loads on entire string
  try {
    return JSON.parse(text.trim());
  } catch { /* continue */ }

  // Strategy 3: Find lines starting with {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("{")) {
      const candidate = lines.slice(i).join("\n");
      // Find matching closing brace
      let depth = 0;
      for (const ch of candidate) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
        if (depth === 0) {
          try {
            return JSON.parse(candidate.slice(0, candidate.indexOf("}") + 1));
          } catch { break; }
        }
      }
    }
  }

  return null;
}

export const Route = createFileRoute("/api/ai/generate-caption")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            topic = "",
            body: contentBody = "",
            platform = "Facebook",
            tone = "professional",
            client_name = "",
          } = body;

          if (!topic || !topic.trim()) {
            return new Response(
              JSON.stringify({ error: "Missing required field: topic" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          // Build user prompt
          const userParts: string[] = [
            `Generate a social media post for ${platform}.`,
            "",
            `Topic: ${topic.trim()}`,
          ];
          if (contentBody?.trim()) {
            userParts.push(`Content details: ${contentBody.trim()}`);
          }
          if (client_name?.trim()) {
            userParts.push(`Brand/Business: ${client_name.trim()}`);
          }
          userParts.push(`Tone: ${tone}`);
          userParts.push(`Platform: ${platform}`);
          userParts.push("");
          userParts.push("Respond with JSON only. No extra text.");

          const fullPrompt = `${SYSTEM_PROMPT}\n\n${userParts.join("\n")}`;

          const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1024,
              },
            }),
          });

          const data = await resp.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

          if (!content) {
            return new Response(
              JSON.stringify({ error: "Empty response from AI", raw: data }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          // Parse JSON response with fallbacks
          const parsed = parseJsonResponse(content);

          if (parsed?.caption) {
            return new Response(
              JSON.stringify({
                success: true,
                caption: parsed.caption,
                hashtags: parsed.hashtags || [],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // Fallback: use raw content as caption
          return new Response(
            JSON.stringify({
              success: true,
              caption: content,
              hashtags: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
