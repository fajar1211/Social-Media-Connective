import httpx
import asyncio
import base64
import hashlib
import random
import logging
from urllib.parse import quote
from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("image_engine")

POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"

STYLE_SUFFIXES = {
    "photorealistic": ", photorealistic, high quality, professional photography, 4K",
    "artistic": ", artistic, creative, vibrant colors, illustration style",
    "minimal": ", minimalist, clean, simple, modern design",
    "elegant": ", elegant, luxury, premium feel, soft lighting",
    "bold": ", bold, eye-catching, strong colors, dynamic composition",
    "natural": ", natural lighting, organic, authentic, real life",
}


async def describe_reference_image(image_data: str) -> str:
    """Describe a reference image using Gemini Vision API.

    Args:
        image_data: base64 encoded image or URL

    Returns:
        Text description of the image style, colors, composition
    """
    if not GEMINI_API_KEY:
        return ""

    if image_data.startswith("http"):
        parts = [
            {"text": "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text."},
            {"file_data": {"file_uri": image_data}},
        ]
    else:
        clean_b64 = image_data
        if "," in image_data:
            clean_b64 = image_data.split(",", 1)[1]
        parts = [
            {"text": "Describe this image in detail for recreation. Focus on: style, colors, lighting, composition, mood, and key visual elements. Be concise but specific. Output ONLY the description, no extra text."},
            {"inline_data": {"mime_type": "image/jpeg", "data": clean_b64}},
        ]

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 512,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.warning(f"Gemini vision describe failed: {e}")
        return ""


def build_enhanced_prompt(user_prompt: str, reference_desc: str = "", style: str = "") -> str:
    """Build an enhanced prompt combining user input, reference description, and style.

    Args:
        user_prompt: The user's image prompt
        reference_desc: Description from reference image (optional)
        style: Style preset key (optional)

    Returns:
        Enhanced prompt string
    """
    parts = [user_prompt.strip()]

    if reference_desc:
        parts.append(f"Style reference: {reference_desc.strip()}")

    style_suffix = STYLE_SUFFIXES.get(style, "")
    if style_suffix:
        parts.append(style_suffix.strip())

    return ", ".join(parts)


def build_pollinations_url(prompt: str, width: int = 1024, height: int = 1024, seed: int = -1, model: str = "flux") -> str:
    """Build a Pollinations.ai image URL.

    Args:
        prompt: Image generation prompt
        width: Image width (default 1024)
        height: Image height (default 1024)
        seed: Random seed (-1 for random)
        model: Model name (flux, flux-realism, flux-anime, flux-3d, turbo)

    Returns:
        Full Pollinations URL
    """
    if seed == -1:
        seed = random.randint(1, 999999)

    encoded_prompt = quote(prompt, safe="")
    url = f"{POLLINATIONS_BASE}/{encoded_prompt}?width={width}&height={height}&seed={seed}&model={model}&nologo=true"
    return url


async def generate_single_image(
    prompt: str,
    reference_image: str = "",
    gbp_url: str = "",
    width: int = 1024,
    height: int = 1024,
    style: str = "photorealistic",
    model: str = "flux",
) -> dict:
    """Generate a single image.

    Args:
        prompt: User's image prompt
        reference_image: base64 reference image (optional)
        gbp_url: GBP image URL for reference (optional)
        width: Image width
        height: Image height
        style: Style preset
        model: Pollinations model

    Returns:
        {"success": bool, "image_url": str, "seed": int, "enhanced_prompt": str, "error": str}
    """
    reference_desc = ""

    if gbp_url:
        reference_desc = await describe_reference_image(gbp_url)
        logger.info(f"Reference described from GBP URL: {reference_desc[:80]}...")
    elif reference_image:
        reference_desc = await describe_reference_image(reference_image)
        logger.info(f"Reference described from uploaded image: {reference_desc[:80]}...")

    enhanced_prompt = build_enhanced_prompt(prompt, reference_desc, style)
    seed = random.randint(1, 999999)
    image_url = build_pollinations_url(enhanced_prompt, width, height, seed, model)

    logger.info(f"Generated image URL: {image_url[:100]}...")

    return {
        "success": True,
        "image_url": image_url,
        "seed": seed,
        "enhanced_prompt": enhanced_prompt,
        "reference_description": reference_desc,
        "error": "",
    }


async def generate_carousel(
    prompts: list[str],
    width: int = 1024,
    height: int = 1024,
    style: str = "photorealistic",
    model: str = "flux",
) -> dict:
    """Generate multiple images for a carousel.

    Args:
        prompts: List of prompts (one per slide)
        width: Image width
        height: Image height
        style: Style preset
        model: Pollinations model

    Returns:
        {"success": bool, "images": list[dict], "error": str}
    """
    if not prompts:
        return {"success": False, "images": [], "error": "No prompts provided"}

    images = []
    for i, prompt in enumerate(prompts):
        enhanced_prompt = build_enhanced_prompt(prompt, style=style)
        seed = random.randint(1, 999999)
        image_url = build_pollinations_url(enhanced_prompt, width, height, seed, model)

        images.append({
            "index": i,
            "prompt": prompt,
            "enhanced_prompt": enhanced_prompt,
            "image_url": image_url,
            "seed": seed,
        })

        if i < len(prompts) - 1:
            await asyncio.sleep(2)

    logger.info(f"Generated {len(images)} carousel images")

    return {
        "success": True,
        "images": images,
        "error": "",
    }


async def generate_variations(
    prompt: str,
    count: int = 3,
    width: int = 1024,
    height: int = 1024,
    style: str = "photorealistic",
    model: str = "flux",
) -> dict:
    """Generate multiple variations of the same prompt with different seeds.

    Args:
        prompt: Single prompt to generate variations from
        count: Number of variations (max 6)
        width: Image width
        height: Image height
        style: Style preset
        model: Pollinations model

    Returns:
        {"success": bool, "images": list[dict], "error": str}
    """
    count = min(count, 6)
    enhanced_prompt = build_enhanced_prompt(prompt, style=style)

    images = []
    for i in range(count):
        seed = random.randint(1, 999999)
        image_url = build_pollinations_url(enhanced_prompt, width, height, seed, model)

        images.append({
            "index": i,
            "prompt": prompt,
            "enhanced_prompt": enhanced_prompt,
            "image_url": image_url,
            "seed": seed,
        })

        if i < count - 1:
            await asyncio.sleep(2)

    logger.info(f"Generated {len(images)} variations")

    return {
        "success": True,
        "images": images,
        "error": "",
    }
