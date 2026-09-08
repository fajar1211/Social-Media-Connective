import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Create ONE social media post. Output ONLY a JSON object. No other text before or after the JSON.

MANDATORY: Use the Knowledge Context provided below. Reference specific details like brand name, products, location, chef, audience, values. Generic content without brand-specific details is wrong.

{
  "topic": "Short title max 80 chars describing the post theme",
  "caption": "Post body text only. Clean. No hashtags. No CTA. No image_prompt.",
  "hashtags": ["tag1", "tag2"],
  "cta": "One sentence call to action",
  "image_prompt": "Detailed visual description for AI image generation",
  "content_type": "Image"
}

Platform rules:
- Instagram: caption 100-2200 chars. Storytelling. Engaging. Natural emojis. Personal connection.
- Facebook: caption 100-500 chars. Informative. Conversational. Community-focused.
- Twitter: caption under 280 chars. Punchy. Direct.

Field rules:
- caption: Main post body. No hashtags. No CTA. No image_prompt. No reasoning. No explanation.
- hashtags: 3-15 tags WITHOUT # symbol. Brand-specific and relevant.
- cta: One sentence telling readers what to do next.
- image_prompt: Detailed visual for AI image generation. Include colors, setting, mood.
- content_type: "Image", "Carousel", "Text Post", or "Short Video".

NEVER output thinking text, reasoning, drafts, or explanations. ONLY output the JSON object.`;

function parseJsonResponse(text: string): { topic?: string; caption?: string; hashtags?: string[]; cta?: string; image_prompt?: string; content_type?: string } | null {
  const THINKING_PATTERNS = [
    "Social Media Content Expert",
    "Valid JSON only",
    "One Instagram post",
    "One Facebook post",
    "Generate engaging",
    "act as a social media",
    "you are a social media",
    "Create ONE social media",
    "caption:",
    "hashtags:",
    "image_prompt:",
    "content_type:",
    "---",
    "Draft:",
    "Refining",
    "Self-Correction",
    "Final check",
    "Final JSON",
    "JSON valid",
    "Checking constraints",
    "Wait,",
    "I should",
    "I will",
    "This is",
  ];

  const isValidResponse = (obj: Record<string, unknown>): boolean => {
    if (!obj || typeof obj !== "object") return false;
    if (typeof obj.caption !== "string" || obj.caption.length < 20) return false;
    if (!Array.isArray(obj.hashtags) || obj.hashtags.length < 1) return false;
    if (typeof obj.topic !== "string" || obj.topic.length < 5) return false;

    const caption = (obj.caption as string).toLowerCase();

    for (const pattern of THINKING_PATTERNS) {
      if (caption.includes(pattern.toLowerCase())) return false;
    }

    if (caption.includes("{") && caption.includes("}")) return false;
    if (caption.includes('"topic"')) return false;
    if (caption.includes('"caption"')) return false;
    if (caption.length > 2500) return false;

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
            `Create ONE ${platform} post.`,
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
            userParts.push("Knowledge Context — USE THESE DETAILS in your content:");
            for (const kf of knowledge_files) {
              if (kf.content?.trim()) {
                userParts.push(`[${kf.name}]:`);
                userParts.push(kf.content.trim());
                userParts.push("");
              }
            }
          }
          userParts.push(`Tone: ${tone}`);
          userParts.push(`Platform: ${platform}`);
          if (variety) {
            userParts.push(`Post style: ${variety}`);
          }
          userParts.push("");
          userParts.push("Output ONLY a valid JSON object. No other text.");

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

          // Fallback: return error instead of using thinking text as caption
          return new Response(
            JSON.stringify({
              error: "Failed to parse AI response. The AI returned thinking text instead of valid JSON.",
              raw: content.slice(0, 500),
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
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
