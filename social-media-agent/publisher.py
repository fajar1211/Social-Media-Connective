import httpx
import logging
from config import FB_GRAPH_BASE, FB_APP_ID, FB_APP_SECRET

logger = logging.getLogger("publisher")


async def validate_facebook_token(page_access_token: str) -> dict:
    """Validate a Facebook access token and return its info.

    Returns: {"valid": bool, "expires_in": int, "scopes": list[str], "error": str}
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{FB_GRAPH_BASE}/debug_token",
            params={
                "input_token": page_access_token,
                "access_token": f"{FB_APP_ID}|{FB_APP_SECRET}",
            },
        )
        data = resp.json()

    if "data" in data:
        token_data = data["data"]
        return {
            "valid": token_data.get("is_valid", False),
            "expires_in": token_data.get("expires_at", 0),
            "scopes": token_data.get("scopes", []),
            "error": "",
        }
    else:
        error = data.get("error", {})
        return {
            "valid": False,
            "expires_in": 0,
            "scopes": [],
            "error": error.get("message", str(data)),
        }


async def exchange_for_long_lived_token(short_token: str) -> dict:
    """Exchange a short-lived user token for a long-lived user token.

    Returns: {"success": bool, "access_token": str, "expires_in": int, "error": str}
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{FB_GRAPH_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": FB_APP_ID,
                "client_secret": FB_APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        data = resp.json()

    if "access_token" in data:
        return {
            "success": True,
            "access_token": data["access_token"],
            "expires_in": data.get("expires_in", 0),
            "error": "",
        }
    else:
        error = data.get("error", {})
        return {
            "success": False,
            "access_token": "",
            "expires_in": 0,
            "error": error.get("message", str(data)),
        }


async def get_page_access_token(user_token: str, page_id: str) -> dict:
    """Get a page access token from a user token.

    Returns: {"success": bool, "page_access_token": str, "error": str}
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{FB_GRAPH_BASE}/{page_id}",
            params={
                "fields": "access_token",
                "access_token": user_token,
            },
        )
        data = resp.json()

    if "access_token" in data:
        return {
            "success": True,
            "page_access_token": data["access_token"],
            "error": "",
        }
    else:
        error = data.get("error", {})
        return {
            "success": False,
            "page_access_token": "",
            "error": error.get("message", str(data)),
        }


async def publish_facebook_post(page_id: str, page_access_token: str, message: str, link: str = "") -> dict:
    """Publish a text post to a Facebook Page.

    Returns: {"success": bool, "post_id": str, "error": str}
    """
    # Validate token first
    validation = await validate_facebook_token(page_access_token)
    if not validation["valid"]:
        return {
            "success": False,
            "post_id": "",
            "error": f"Invalid or expired token: {validation['error'] or 'Token validation failed'}",
        }

    payload = {"message": message, "access_token": page_access_token}
    if link:
        payload["link"] = link

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{FB_GRAPH_BASE}/{page_id}/feed",
            data=payload,
        )
        data = resp.json()

    if "id" in data:
        return {"success": True, "post_id": data["id"], "error": ""}
    else:
        error = data.get("error", {})
        return {
            "success": False,
            "post_id": "",
            "error": error.get("message", str(data)),
        }


async def publish_facebook_photo(page_id: str, page_access_token: str, image_url: str, caption: str = "") -> dict:
    """Publish a photo to a Facebook Page.

    Returns: {"success": bool, "post_id": str, "error": str}
    """
    # Validate token first
    validation = await validate_facebook_token(page_access_token)
    if not validation["valid"]:
        return {
            "success": False,
            "post_id": "",
            "error": f"Invalid or expired token: {validation['error'] or 'Token validation failed'}",
        }

    payload = {
        "url": image_url,
        "access_token": page_access_token,
    }
    if caption:
        payload["caption"] = caption

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{FB_GRAPH_BASE}/{page_id}/photos",
            data=payload,
        )
        data = resp.json()

    if "id" in data:
        return {"success": True, "post_id": data["id"], "error": ""}
    else:
        error = data.get("error", {})
        return {
            "success": False,
            "post_id": "",
            "error": error.get("message", str(data)),
        }


async def publish_facebook_scheduled(
    page_id: str, page_access_token: str, message: str,
    scheduled_publish_time: int, link: str = "",
) -> dict:
    """Schedule a post on a Facebook Page.

    Args:
        scheduled_publish_time: Unix timestamp for when to publish.

    Returns: {"success": bool, "post_id": str, "scheduled_publish_time": int, "error": str}
    """
    # Validate token first
    validation = await validate_facebook_token(page_access_token)
    if not validation["valid"]:
        return {
            "success": False,
            "post_id": "",
            "scheduled_publish_time": 0,
            "error": f"Invalid or expired token: {validation['error'] or 'Token validation failed'}",
        }

    payload = {
        "message": message,
        "published": "false",
        "scheduled_publish_time": str(scheduled_publish_time),
        "access_token": page_access_token,
    }
    if link:
        payload["link"] = link

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{FB_GRAPH_BASE}/{page_id}/feed",
            data=payload,
        )
        data = resp.json()

    if "id" in data:
        return {
            "success": True,
            "post_id": data["id"],
            "scheduled_publish_time": scheduled_publish_time,
            "error": "",
        }
    else:
        error = data.get("error", {})
        return {
            "success": False,
            "post_id": "",
            "scheduled_publish_time": 0,
            "error": error.get("message", str(data)),
        }


async def publish_instagram_media(
    ig_account_id: str, access_token: str, image_url: str, caption: str = "",
) -> dict:
    """Publish media to Instagram (2-step: create container → publish).

    Returns: {"success": bool, "post_id": str, "error": str}
    """
    async with httpx.AsyncClient(timeout=60) as client:
        # Step 1: Create media container
        create_resp = await client.post(
            f"{FB_GRAPH_BASE}/{ig_account_id}/media",
            data={
                "image_url": image_url,
                "caption": caption,
                "access_token": access_token,
            },
        )
        create_data = create_resp.json()

        if "id" not in create_data:
            error = create_data.get("error", {})
            return {
                "success": False,
                "post_id": "",
                "error": error.get("message", str(create_data)),
            }

        container_id = create_data["id"]

        # Step 2: Publish the container
        publish_resp = await client.post(
            f"{FB_GRAPH_BASE}/{ig_account_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": access_token,
            },
        )
        publish_data = publish_resp.json()

    if "id" in publish_data:
        return {"success": True, "post_id": publish_data["id"], "error": ""}
    else:
        error = publish_data.get("error", {})
        return {
            "success": False,
            "post_id": "",
            "error": error.get("message", str(publish_data)),
        }


async def publish_instagram_reel(
    ig_account_id: str, access_token: str, video_url: str, caption: str = "",
) -> dict:
    """Publish a reel/video to Instagram (2-step: create container → publish).

    Returns: {"success": bool, "post_id": str, "error": str}
    """
    async with httpx.AsyncClient(timeout=120) as client:
        # Step 1: Create reel container
        create_resp = await client.post(
            f"{FB_GRAPH_BASE}/{ig_account_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "share_to_feed": "true",
                "access_token": access_token,
            },
        )
        create_data = create_resp.json()

        if "id" not in create_data:
            error = create_data.get("error", {})
            return {
                "success": False,
                "post_id": "",
                "error": error.get("message", str(create_data)),
            }

        container_id = create_data["id"]

        # Step 2: Publish the container
        publish_resp = await client.post(
            f"{FB_GRAPH_BASE}/{ig_account_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": access_token,
            },
        )
        publish_data = publish_resp.json()

    if "id" in publish_data:
        return {"success": True, "post_id": publish_data["id"], "error": ""}
    else:
        error = publish_data.get("error", {})
        return {
            "success": False,
            "post_id": "",
            "error": error.get("message", str(publish_data)),
        }


async def check_facebook_token(page_access_token: str) -> dict:
    """Debug/check a Facebook access token.

    Returns: {"valid": bool, "expires_in": int, "scopes": list[str], "error": str}
    """
    return await validate_facebook_token(page_access_token)
