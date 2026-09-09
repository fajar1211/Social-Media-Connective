const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeneratePostResult {
  topic: string;
  caption: string;
  hashtags: string[];
  cta: string;
  image_prompt: string;
  content_type: string;
}

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

function cleanResponseText(text: string): string {
  let cleaned = text;
  // Strip <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Strip markdown code fences
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  // Strip non-printable chars and replacement chars
  cleaned = cleaned.replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  // Strip stray backticks
  cleaned = cleaned.replace(/`/g, "");
  return cleaned.trim();
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = cleanResponseText(text);

  // Strategy 1: Find balanced JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { /* continue */ }
  }

  // Strategy 2: Regex match
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* continue */ }
  }

  return null;
}

/**
 * Single-call architecture: generate everything in ONE Gemini call.
 * Input: topic, platform, tone, knowledge, goal
 * Output: { topic, caption, hashtags, cta, image_prompt }
 */
export async function generatePost(params: {
  topic: string;
  platform: string;
  tone: string;
  knowledge: string[];
  client_name: string;
  variety: string;
  goal: string;
}): Promise<GeneratePostResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("[generatePost] No API key configured");
    return null;
  }

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.slice(0, 5).join("\n\n").slice(0, 1200)
    : "";

  const platformRules: Record<string, string> = {
    Instagram: "100-2200 chars. Storytelling. Personal. Engaging. Natural emojis.",
    Facebook: "100-500 chars. Conversational. Community-focused. Warm.",
    Twitter: "Under 280 chars. Punchy. Direct.",
  };

  const prompt = `You are a social media content creator. Create ONE ${params.platform} post.

IMPORTANT RULES:
- Reference the SPECIFIC brand details from KNOWLEDGE below
- Do NOT use placeholder text like [brand name] or [location]
- Use the actual brand name, products, location from the knowledge
- Write naturally, do NOT include the word "brand" literally in the output
- Output ONLY valid JSON, no other text

KNOWLEDGE:
${knowledgeText || "No additional brand info available. Use the client name: " + params.client_name}

TOPIC: ${params.topic}
GOAL: ${params.goal || "Engagement"}
CLIENT: ${params.client_name}
PLATFORM: ${params.platform}
TONE: ${params.tone}
${params.variety ? "STYLE: " + params.variety : ""}

PLATFORM RULES: ${platformRules[params.platform] || platformRules["Facebook"]}

Output JSON only:
{"topic":"short topic title","caption":"the full post caption","hashtags":["tag1","tag2","tag3"],"cta":"call to action sentence","image_prompt":"detailed visual description for AI image generation","content_type":"Image"}`;

  // Try up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 4000);
      if (!content) {
        console.error(`[generatePost] Empty response on attempt ${attempt + 1}`);
        continue;
      }

      const parsed = extractJson(content);

      if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string") {
        const p = parsed as Record<string, unknown>;
        const caption = (p["caption"] as string).trim();

        if (caption.length >= 20) {
          const hashtags = Array.isArray(p["hashtags"])
            ? (p["hashtags"] as string[]).map((t: string) => t.replace(/^#/, "").trim()).filter(Boolean)
            : [];

          return {
            topic: ((p["topic"] as string) || params.topic).slice(0, 80),
            caption,
            hashtags: hashtags.slice(0, 10),
            cta: (p["cta"] as string) || "",
            image_prompt: (p["image_prompt"] as string) || "",
            content_type: (p["content_type"] as string) || "Image",
          };
        }
        console.error(`[generatePost] Caption too short (${caption.length} chars) on attempt ${attempt + 1}`);
      } else {
        console.error(`[generatePost] No valid caption in response on attempt ${attempt + 1}. Raw:`, content.substring(0, 200));
      }
    } catch (err) {
      console.error(`[generatePost] Error on attempt ${attempt + 1}:`, err);
    }
  }

  console.error("[generatePost] All 3 attempts failed");
  return null;
}
