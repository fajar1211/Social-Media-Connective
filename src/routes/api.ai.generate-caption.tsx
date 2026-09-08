import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Generate ONE social media post as a JSON object.

Example output:
{"topic":"Welcome to Our Restaurant","caption":"We are thrilled to open our doors and share our passion for food with you. Every dish tells a story.","hashtags":["restaurant","foodie","dining"],"cta":"Book your table today!","image_prompt":"Elegant restaurant interior with warm lighting","content_type":"Image"}

Rules:
- caption: actual post text only, no hashtags or CTA
- hashtags: 3-15 tags without # symbol
- cta: one sentence call to action
- image_prompt: detailed visual description
- content_type: Image, Carousel, Text Post, or Short Video`;

interface ApiResponse {
  topic?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
  image_prompt?: string;
  content_type?: string;
}

function preProcessResponse(text: string): string {
  let cleaned = text;

  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBrace + 1);
  }

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) {
    cleaned = cleaned.slice(firstBrace);
  }

  return cleaned.trim();
}

function isValidResponse(obj: Record<string, unknown>): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.caption !== "string" || obj.caption.length < 20) return false;
  if (!Array.isArray(obj.hashtags) || obj.hashtags.length < 1) return false;
  if (typeof obj.topic !== "string" || obj.topic.length < 3) return false;

  const caption = (obj.caption as string).toLowerCase();

  const badPatterns = [
    "social media content expert",
    "valid json only",
    "one instagram post",
    "one facebook post",
    "generate engaging",
    "act as a social media",
    "you are a social media",
    "create one social media",
    "output only a valid json",
    "no other text",
    "draft:",
    "refining",
    "self-correction",
    "final check",
    "json valid",
    "checking constraints",
    "i should",
    "i will",
    "topic:",
    "\"topic\":",
    "\"caption\":",
    "\"hashtags\":",
    "\"cta\":",
    "\"image_prompt\":",
  ];

  for (const pattern of badPatterns) {
    if (caption.includes(pattern)) return false;
  }

  if (caption.includes("{") && caption.includes("}")) return false;
  if (caption.length > 2500) return false;

  const topic = (obj.topic as string || "").toLowerCase();
  for (const pattern of badPatterns) {
    if (topic.includes(pattern)) return false;
  }

  return true;
}

function parseJsonResponse(text: string): ApiResponse | null {
  const cleaned = preProcessResponse(text);

  try {
    const parsed = JSON.parse(cleaned);
    if (isValidResponse(parsed)) return parsed;
  } catch { /* continue */ }

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidResponse(parsed)) return parsed;
    } catch { /* continue */ }
  }

  for (let i = cleaned.length - 1; i >= 0; i--) {
    if (cleaned[i] === "{") {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let j = i; j < cleaned.length; j++) {
        const ch = cleaned[j];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            try {
              const candidate = cleaned.slice(i, j + 1);
              const parsed = JSON.parse(candidate);
              if (isValidResponse(parsed)) return parsed;
            } catch { /* not valid JSON */ }
            break;
          }
        }
      }
    }
  }

  const partial = tryExtractPartialJson(text);
  if (partial && partial.caption && partial.caption.length >= 20) return partial;

  return null;
}

function tryExtractPartialJson(text: string): ApiResponse | null {
  const topicMatch = text.match(/"topic"\s*:\s*"([^"]+)"/);
  const captionMatch = text.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const hashtagsMatch = text.match(/"hashtags"\s*:\s*\[((?:[^"\]]|"([^"]+)")*)\]/);
  const ctaMatch = text.match(/"cta"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const imagePromptMatch = text.match(/"image_prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const contentTypeMatch = text.match(/"content_type"\s*:\s*"([^"]+)"/);

  if (!captionMatch || !hashtagsMatch) return null;

  const caption = captionMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n');

  if (caption.length < 20) return null;
  if (caption.includes('"topic"') || caption.includes('"caption"')) return null;

  const tags: string[] = [];
  const tagRegex = /"([^"]+)"/g;
  let tagMatch = tagRegex.exec(hashtagsMatch[1]);
  while (tagMatch !== null) {
    tags.push(tagMatch[1]);
    tagMatch = tagRegex.exec(hashtagsMatch[1]);
  }
  if (tags.length === 0) {
    const rawTags = hashtagsMatch[1].replace(/[\[\]]/g, "").split(",");
    for (const t of rawTags) {
      const cleaned = t.trim().replace(/^#/, "").replace(/"/g, "");
      if (cleaned) tags.push(cleaned);
    }
  }

  const cta = ctaMatch ? ctaMatch[1].replace(/\\"/g, '"') : "";
  const imagePrompt = imagePromptMatch ? imagePromptMatch[1].replace(/\\"/g, '"') : "";
  const topic = topicMatch ? topicMatch[1] : "";

  if (caption.includes(cta) || caption.includes(imagePrompt)) return null;

  return {
    topic: topic || "",
    caption,
    hashtags: tags,
    cta,
    image_prompt: imagePrompt,
    content_type: contentTypeMatch ? contentTypeMatch[1] : "Image",
  };
}

async function callGemini(
  apiKey: string,
  fullPrompt: string,
  maxTokens: number
): Promise<{ ok: boolean; content: string; error?: string }> {
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  const data = await resp.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!content) {
    return { ok: false, content: "", error: data?.error?.message || "Empty response from AI" };
  }

  return { ok: true, content };
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

          const platformRules: Record<string, string> = {
            Instagram: "100-2200 chars. Storytelling. Engaging.",
            Facebook: "100-500 chars. Informative. Conversational.",
            Twitter: "Under 280 chars. Punchy. Direct.",
          };

          const knowledgeText = knowledge_files.length > 0
            ? knowledge_files
                .filter((kf: { name: string; content: string }) => kf.content?.trim())
                .map((kf: { name: string; content: string }) => `${kf.name}: ${kf.content.trim().slice(0, 300)}`)
                .join(" | ")
            : "";

          const fullPrompt = [
            SYSTEM_PROMPT,
            `Topic: ${topic.trim()}. Brand: ${client_name || "Unknown"}. Platform: ${platform}. Tone: ${tone}.`,
            `Caption rules: ${platformRules[platform] || platformRules.Facebook}`,
            knowledgeText ? `Brand details: ${knowledgeText}` : "",
            contentBody?.trim() ? `Extra: ${contentBody.trim()}` : "",
            variety ? `Style: ${variety}` : "",
          ].filter(Boolean).join("\n");

          let parsed: ApiResponse | null = null;
          let lastRaw = "";

          const attempt1 = await callGemini(apiKey, fullPrompt, 4000);
          lastRaw = attempt1.content;

          if (attempt1.ok) {
            parsed = parseJsonResponse(attempt1.content);
          }

          if (!parsed) {
            const retryPrompt = [
              `Generate ONE ${platform} post as JSON.`,
              `Topic: ${topic.trim()}. Brand: ${client_name || "brand"}. Tone: ${tone}.`,
              `Example: {"topic":"Topic","caption":"Post body text here","hashtags":["tag1","tag2"],"cta":"Call to action","image_prompt":"Image description","content_type":"Image"}`,
            ].join("\n");

            const attempt2 = await callGemini(apiKey, retryPrompt, 2048);
            lastRaw = attempt2.content;

            if (attempt2.ok) {
              parsed = parseJsonResponse(attempt2.content);
            }
          }

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

          return new Response(
            JSON.stringify({
              error: "AI returned thinking text instead of valid JSON. Please try again.",
              raw: lastRaw.slice(0, 300),
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
