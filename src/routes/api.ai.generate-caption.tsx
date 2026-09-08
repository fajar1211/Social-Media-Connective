import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a social media content expert. Generate engaging social media posts.
You MUST respond with valid JSON only. No markdown, no code blocks, no extra text.

The JSON must have this exact structure:
{
  "topic": "Short topic title (max 80 chars)",
  "caption": "The post caption/body text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "A call-to-action sentence",
  "image_prompt": "Detailed prompt for generating a relevant image",
  "content_type": "Image"
}

Rules:
- topic: short, descriptive title for the post (max 80 chars)
- caption: engaging, platform-appropriate text (max 2200 chars for Instagram, 280 for Twitter)
- hashtags: 3-15 tags WITHOUT the # symbol
- cta: a single sentence call-to-action relevant to the content
- image_prompt: detailed description for AI image generation
- content_type: one of "Image", "Carousel", "Text Post", "Short Video"
- Match the tone requested
- Do NOT include hashtags in the caption text
- If knowledge context is provided, use it to make content more specific and authentic`;

function parseJsonResponse(text: string): { topic?: string; caption?: string; hashtags?: string[]; cta?: string; image_prompt?: string; content_type?: string } | null {
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

  // Strategy 4: Find LAST JSON object with "caption" and non-empty "hashtags"
  // Scan from end of text backwards to find the actual response JSON
  for (let searchIdx = text.length - 1; searchIdx >= 0; searchIdx--) {
    if (text[searchIdx] === "{") {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = searchIdx; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            try {
              const parsed = JSON.parse(text.slice(searchIdx, i + 1));
              // Only accept if it has caption AND non-empty hashtags array
              if (parsed?.caption && Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0) {
                return parsed;
              }
            } catch { /* not valid JSON, continue */ }
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
