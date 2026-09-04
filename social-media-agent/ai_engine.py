import httpx
import json
from config import OLLAMA_URL, OLLAMA_MODEL, GEMINI_API_KEY, GEMINI_MODEL, AI_PROVIDER


GENERATION_SYSTEM_PROMPT = """You are a social media content expert. Generate engaging social media posts.
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
- Do NOT include hashtags in the caption text itself, return them separately"""


async def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    """Call Google Gemini API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 1024,
        },
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    """Call local Ollama API."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.8, "num_predict": 1024},
            },
        )
        resp.raise_for_status()
        result = resp.json()
    return result.get("message", {}).get("content", "{}")


def _parse_json_response(content: str) -> dict:
    """Extract JSON from AI response (handles markdown code blocks)."""
    import re
    # Try to extract from markdown code blocks
    code_blocks = re.findall(r"```(?:json)?\s*\n?(.*?)\n?\s*```", content, re.DOTALL)
    for block in code_blocks:
        try:
            parsed = json.loads(block.strip())
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    # Try raw JSON
    try:
        parsed = json.loads(content.strip())
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    # Try line by line
    for line in content.strip().split("\n"):
        line = line.strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    return {}


async def generate_caption(
    topic: str,
    body: str = "",
    platform: str = "Facebook",
    tone: str = "professional",
    client_name: str = "",
) -> dict:
    """Generate caption and hashtags.

    Returns: {"caption": str, "hashtags": list[str]}
    """
    user_prompt = f"Generate a social media post for {platform}.\n\nTopic: {topic}\n"
    if body:
        user_prompt += f"Content details: {body}\n"
    if client_name:
        user_prompt += f"Brand/Business: {client_name}\n"
    user_prompt += f"Tone: {tone}\nPlatform: {platform}\n\nRespond with JSON only. No extra text."

    try:
        if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
            content = await _call_gemini(GENERATION_SYSTEM_PROMPT, user_prompt)
        else:
            content = await _call_ollama(GENERATION_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        raise RuntimeError(f"AI generation failed: {e}")

    parsed = _parse_json_response(content)
    return {
        "caption": parsed.get("caption", content if not parsed else ""),
        "hashtags": parsed.get("hashtags", []),
    }


async def generate_hashtags(topic: str, platform: str = "Facebook", count: int = 10) -> list[str]:
    """Generate hashtags only."""
    system = "You are a hashtag expert. Respond with JSON array only."
    user = f"Generate {count} relevant hashtags for a {platform} post about: {topic}\n\nReturn JSON array only: [\"tag1\", \"tag2\", ...]\nNo # symbol. No extra text."

    try:
        if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
            content = await _call_gemini(system, user)
        else:
            content = await _call_ollama(system, user)
    except Exception:
        return []

    try:
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return parsed
        return parsed.get("hashtags", [])
    except json.JSONDecodeError:
        return []


async def check_ollama_health() -> bool:
    """Check if Ollama or Gemini is available."""
    if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
                )
                return resp.status_code == 200
        except Exception:
            return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
