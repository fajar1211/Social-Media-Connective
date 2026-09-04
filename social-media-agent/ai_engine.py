import httpx
import json
from config import OLLAMA_URL, OLLAMA_MODEL


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


async def generate_caption(
    topic: str,
    body: str = "",
    platform: str = "Facebook",
    tone: str = "professional",
    client_name: str = "",
) -> dict:
    """Generate caption and hashtags using Ollama.

    Returns: {"caption": str, "hashtags": list[str]}
    """
    user_prompt = f"""Generate a social media post for {platform}.

Topic: {topic}
"""
    if body:
        user_prompt += f"Content details: {body}\n"
    if client_name:
        user_prompt += f"Brand/Business: {client_name}\n"

    user_prompt += f"""
Tone: {tone}
Platform: {platform}

Respond with JSON only. No extra text."""

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.8,
                    "num_predict": 1024,
                },
            },
        )
        resp.raise_for_status()
        result = resp.json()

    content = result.get("message", {}).get("content", "{}")

    try:
        parsed = json.loads(content)
        return {
            "caption": parsed.get("caption", ""),
            "hashtags": parsed.get("hashtags", []),
        }
    except json.JSONDecodeError:
        lines = content.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("{"):
                try:
                    parsed = json.loads(line)
                    return {
                        "caption": parsed.get("caption", ""),
                        "hashtags": parsed.get("hashtags", []),
                    }
                except json.JSONDecodeError:
                    continue
        return {"caption": content, "hashtags": []}


async def generate_hashtags(topic: str, platform: str = "Facebook", count: int = 10) -> list[str]:
    """Generate hashtags only using Ollama."""
    user_prompt = f"""Generate {count} relevant hashtags for a {platform} post about: {topic}

Return JSON array only: ["tag1", "tag2", ...]
No # symbol. No extra text."""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a hashtag expert. Respond with JSON array only."},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.9, "num_predict": 256},
            },
        )
        resp.raise_for_status()
        result = resp.json()

    content = result.get("message", {}).get("content", "[]")
    try:
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return parsed
        return parsed.get("hashtags", [])
    except json.JSONDecodeError:
        return []


async def check_ollama_health() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
