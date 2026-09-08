import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media content expert. Generate ONE social media post.

RESPOND WITH VALID JSON ONLY. No markdown, no code blocks, no thinking, no explanation.

{
  "topic": "Short title (max 80 chars)",
  "caption": "Post body text ONLY - no hashtags, no CTA, no extra text",
  "hashtags": ["tag1", "tag2"],
  "cta": "Call to action sentence",
  "image_prompt": "Description for AI image generation",
  "content_type": "Image"
}

CRITICAL RULES:
- caption: The main post text. Do NOT include hashtags, CTA, or image prompt in caption. Keep it clean and engaging. Max 2200 chars for Instagram, 280 for Twitter.
- hashtags: Array of 3-15 relevant tags WITHOUT # symbol. Separate from caption.
- cta: One sentence telling readers what to do next.
- image_prompt: Detailed visual description for image generation.
- content_type: One of "Image", "Carousel", "Text Post", "Short Video".
- Use the Knowledge Context below to make content specific and authentic to the brand.
- Match the tone requested.
- Do NOT explain your reasoning. Output JSON only.`;

function parseJsonResponse(text: string): { topic?: string; caption?: string; hashtags?: string[]; cta?: string; image_prompt?: string; content_type?: string } | null {
  // Helper: validate JSON has all required fields with real content
  const isValidResponse = (obj: Record<string, unknown>): boolean => {
    if (!obj || typeof obj !== "object") return false;
    if (typeof obj.caption !== "string" || obj.caption.length < 10) return false;
    if (!Array.isArray(obj.hashtags) || obj.hashtags.length < 1) return false;
    // Reject if caption contains thinking patterns
    const caption = obj.caption as string;
    if (caption.includes("Social Media Content Expert") || caption.includes("Valid JSON only")) return false;
    if (caption.includes("caption:") || caption.includes("hashtags:")) return false;
    return true;
  };

  // Strategy 1: Try raw JSON parse (fastest)
  try {
    const parsed = JSON.parse(text.trim());
    if (isValidResponse(parsed)) return parsed;
  } catch { /* continue */ }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidResponse(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Strategy 3: Scan backwards from end of text, find LAST valid JSON
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "{") {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            try {
              const candidate = text.slice(i, j + 1);
              const parsed = JSON.parse(candidate);
              if (isValidResponse(parsed)) return parsed;
            } catch { /* not valid JSON */ }
            break;
          }
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
            knowledge_files = [],
            variety = "",
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
          if (knowledge_files.length > 0) {
            userParts.push("");
            userParts.push("Knowledge Context:");
            for (const kf of knowledge_files) {
              if (kf.content?.trim()) {
                userParts.push(`--- ${kf.name} ---`);
                userParts.push(kf.content.trim());
                userParts.push("");
              }
            }
          }
          userParts.push(`Tone: ${tone}`);
          userParts.push(`Platform: ${platform}`);
          if (variety) {
            userParts.push(`Variation focus: ${variety}`);
          }
          userParts.push("");
          userParts.push("Respond with JSON only. No extra text.");

          const fullPrompt = `${SYSTEM_PROMPT}\n\n${userParts.join("\n")}`;

          const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
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
                topic: parsed.topic || topic.trim(),
                caption: parsed.caption,
                hashtags: parsed.hashtags || [],
                cta: parsed.cta || "",
                image_prompt: parsed.image_prompt || "",
                content_type: parsed.content_type || "Image",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // Fallback: use raw content as caption
          return new Response(
            JSON.stringify({
              success: true,
              topic: topic.trim(),
              caption: content,
              hashtags: [],
              cta: "",
              image_prompt: "",
              content_type: "Image",
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
