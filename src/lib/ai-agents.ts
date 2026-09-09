const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface TrendAnalysis {
  trending_topics: string[];
  viral_patterns: string[];
  emotional_triggers: string[];
  trending_hashtags: string[];
  content_angle_suggestion: string;
  brand_positioning: string;
}

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
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  cleaned = cleaned.replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  cleaned = cleaned.replace(/`/g, "");
  return cleaned.trim();
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = cleanResponseText(text);
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

// ── AGENT 1: Trend Research + Strategy Analysis ──

export async function analyzeTrendsAndStrategy(params: {
  topic: string;
  platform: string;
  knowledge: string[];
  client_name: string;
  goal: string;
}): Promise<TrendAnalysis | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.slice(0, 5).join("\n\n").slice(0, 1000)
    : `Client: ${params.client_name}`;

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are a social media strategist and trend researcher. Analyze and create a strategy.

DATE: ${today}
TOPIC: ${params.topic}
GOAL: ${params.goal || "Engagement"}
PLATFORM: ${params.platform}
CLIENT: ${params.client_name}

BRAND KNOWLEDGE:
${knowledgeText}

Tasks:
1. Identify 3-5 trending topics relevant to this brand and date
2. Identify 2-3 viral content patterns for ${params.platform}
3. Identify 2-3 emotional triggers that would make this content shareable
4. Suggest 2-3 trending hashtags (WITHOUT # symbol)
5. Suggest a specific content angle that combines brand identity with current trends
6. Define brand positioning for this specific post

Output JSON only:
{"trending_topics":["topic1","topic2"],"viral_patterns":["pattern1","pattern2"],"emotional_triggers":["trigger1","trigger2"],"trending_hashtags":["tag1","tag2"],"content_angle_suggestion":"specific angle","brand_positioning":"how to position this brand in the post"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 2048);
      if (!content) continue;

      const parsed = extractJson(content);
      if (parsed) {
        const p = parsed as Record<string, unknown>;
        return {
          trending_topics: (p["trending_topics"] as string[]) || [],
          viral_patterns: (p["viral_patterns"] as string[]) || [],
          emotional_triggers: (p["emotional_triggers"] as string[]) || [],
          trending_hashtags: (p["trending_hashtags"] as string[]) || [],
          content_angle_suggestion: (p["content_angle_suggestion"] as string) || "",
          brand_positioning: (p["brand_positioning"] as string) || "",
        };
      }
    } catch (err) {
      console.error(`[analyzeTrends] Attempt ${attempt + 1} failed:`, err);
    }
  }

  return null;
}

// ── AGENT 2: Content Generation (uses strategy from Agent 1) ──

export async function generateContent(params: {
  topic: string;
  platform: string;
  tone: string;
  knowledge: string[];
  client_name: string;
  variety: string;
  strategy: TrendAnalysis;
}): Promise<GeneratePostResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.slice(0, 5).join("\n\n").slice(0, 1000)
    : "";

  const platformRules: Record<string, string> = {
    Instagram: "100-2200 chars. Storytelling. Personal. Engaging. Natural emojis.",
    Facebook: "100-500 chars. Conversational. Community-focused. Warm.",
    Twitter: "Under 280 chars. Punchy. Direct.",
  };

  const s = params.strategy;

  const prompt = `You are a social media content creator. Create ONE ${params.platform} post.

CRITICAL RULES:
- Reference SPECIFIC brand details from KNOWLEDGE below
- Do NOT use placeholder text like [brand name] or [location]
- Use actual brand name, products, location from knowledge
- Output ONLY valid JSON, no other text

STRATEGY (from trend analysis):
- Content Angle: ${s.content_angle_suggestion}
- Brand Positioning: ${s.brand_positioning}
- Trending Topics: ${s.trending_topics.join(", ")}
- Viral Patterns: ${s.viral_patterns.join(", ")}
- Emotional Triggers: ${s.emotional_triggers.join(", ")}
- Trending Hashtags: ${s.trending_hashtags.join(", ")}

KNOWLEDGE:
${knowledgeText || "Client: " + params.client_name}

TOPIC: ${params.topic}
CLIENT: ${params.client_name}
PLATFORM: ${params.platform}
TONE: ${params.tone}
${params.variety ? "STYLE: " + params.variety : ""}
PLATFORM RULES: ${platformRules[params.platform] || platformRules["Facebook"]}

Use the trending hashtags naturally in the output hashtags.

Output JSON only:
{"topic":"short topic title","caption":"the full post caption","hashtags":["tag1","tag2","tag3"],"cta":"call to action sentence","image_prompt":"detailed visual description for AI image generation","content_type":"Image"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 4000);
      if (!content) {
        console.error(`[generateContent] Empty response on attempt ${attempt + 1}`);
        continue;
      }

      const parsed = extractJson(content);

      if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string") {
        const p = parsed as Record<string, unknown>;
        const caption = (p["caption"] as string).trim();

        if (caption.length >= 20) {
          const rawHashtags = Array.isArray(p["hashtags"])
            ? (p["hashtags"] as string[])
            : [];
          const hashtags = rawHashtags
            .map((t: string) => t.replace(/^#/, "").trim())
            .filter(Boolean)
            .slice(0, 10);

          return {
            topic: ((p["topic"] as string) || params.topic).slice(0, 80),
            caption,
            hashtags,
            cta: (p["cta"] as string) || "",
            image_prompt: (p["image_prompt"] as string) || "",
            content_type: (p["content_type"] as string) || "Image",
          };
        }
        console.error(`[generateContent] Caption too short (${caption.length}) on attempt ${attempt + 1}`);
      } else {
        console.error(`[generateContent] No valid caption on attempt ${attempt + 1}. Raw:`, content.substring(0, 200));
      }
    } catch (err) {
      console.error(`[generateContent] Error on attempt ${attempt + 1}:`, err);
    }
  }

  return null;
}
