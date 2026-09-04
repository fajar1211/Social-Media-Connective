import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import SCHEDULE_CHECK_INTERVAL, PUBLISH_MAX_RETRIES
from supabase_client import (
    get_content_ready_to_publish,
    get_scheduled_content_ready,
    get_content_by_id,
    get_client,
    update_content_agent_status,
    mark_published,
    mark_failed,
    insert_publish_history,
)
from ai_engine import generate_caption
from publisher import (
    publish_facebook_post,
    publish_facebook_photo,
    publish_instagram_media,
)

logger = logging.getLogger("scheduler")


async def _get_social_integration(client: dict, platform: str) -> dict | None:
    """Extract social integration for a platform from client data."""
    social_ints = client.get("social_integrations", {})
    integration = social_ints.get(platform)
    if integration and integration.get("connected"):
        return integration
    return None


async def _get_page_token(integration: dict) -> tuple[str, str]:
    """Get (page_id, page_access_token) from integration.

    Returns: (page_id, token) or ("", "") if not found.
    """
    if integration.get("selected_page_id") and integration.get("pages"):
        for page in integration["pages"]:
            if page.get("id") == integration["selected_page_id"]:
                return page["id"], page.get("access_token", "")

    if integration.get("pages"):
        page = integration["pages"][0]
        return page.get("id", ""), page.get("access_token", "")

    if integration.get("accountId") and integration.get("accessToken"):
        return integration["accountId"], integration["accessToken"]

    return "", ""


async def publish_single_content(content: dict):
    """Publish a single content item to its connected platform."""
    content_id = content["id"]
    client_id = content.get("client_id", "")
    platform = content.get("platform", "")
    caption = content.get("caption", "")
    body = content.get("body", "")
    media = content.get("media", [])
    hashtags = content.get("hashtags", [])

    logger.info(f"Processing content {content_id} for {platform}")

    await update_content_agent_status(content_id, "publishing")

    client = await get_client(client_id)
    if not client:
        logger.error(f"Client {client_id} not found for content {content_id}")
        await mark_failed(content_id, f"Client {client_id} not found")
        return

    integration = await _get_social_integration(client, platform)
    if not integration:
        logger.warning(f"No {platform} integration for client {client_id}")
        await mark_failed(content_id, f"No {platform} integration connected")
        return

    full_caption = caption
    if hashtags:
        tag_str = " ".join(f"#{t.lstrip('#')}" for t in hashtags)
        full_caption = f"{caption}\n\n{tag_str}" if caption else tag_str

    result = {"success": False, "post_id": "", "error": "Unknown platform"}

    if platform == "Facebook":
        page_id, page_token = await _get_page_token(integration)
        if not page_id or not page_token:
            result = {"success": False, "post_id": "", "error": "No Facebook page token"}
        elif media and media[0]:
            result = await publish_facebook_photo(page_id, page_token, media[0], full_caption)
        else:
            result = await publish_facebook_post(page_id, page_token, full_caption)

    elif platform == "Instagram":
        ig_id = integration.get("accountId", "")
        token = integration.get("accessToken", "")
        if not ig_id or not token:
            result = {"success": False, "post_id": "", "error": "No Instagram account token"}
        elif media and media[0]:
            result = await publish_instagram_media(ig_id, token, media[0], full_caption)
        else:
            result = {"success": False, "post_id": "", "error": "Instagram requires an image"}

    else:
        result = {"success": False, "post_id": "", "error": f"Platform {platform} not yet supported"}

    if result["success"]:
        logger.info(f"Published content {content_id} → {platform} (post_id: {result['post_id']})")
        await mark_published(content_id, platform, result["post_id"])
        await insert_publish_history(
            content_id=content_id,
            client_id=client_id,
            platform=platform,
            post_id=result["post_id"],
            status="success",
        )
    else:
        logger.error(f"Failed content {content_id}: {result['error']}")
        await mark_failed(content_id, result["error"])
        await insert_publish_history(
            content_id=content_id,
            client_id=client_id,
            platform=platform,
            post_id="",
            status="failed",
            error_message=result["error"],
        )


async def check_and_publish():
    """Scheduler job: check for content ready to publish and publish it."""
    try:
        items = await get_content_ready_to_publish()
        scheduled = await get_scheduled_content_ready()

        all_items = {item["id"]: item for item in items}
        for item in scheduled:
            all_items[item["id"]] = item

        if not all_items:
            return

        logger.info(f"Found {len(all_items)} content items to process")

        for content_id, content in all_items.items():
            try:
                await publish_single_content(content)
            except Exception as e:
                logger.exception(f"Error publishing {content_id}: {e}")
                await mark_failed(content_id, str(e))
                await insert_publish_history(
                    content_id=content_id,
                    client_id=content.get("client_id", ""),
                    platform=content.get("platform", ""),
                    post_id="",
                    status="failed",
                    error_message=str(e),
                )
            await asyncio.sleep(1)

    except Exception as e:
        logger.exception(f"Scheduler error: {e}")


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        check_and_publish,
        trigger=IntervalTrigger(seconds=SCHEDULE_CHECK_INTERVAL),
        id="publish_check",
        name="Check and publish pending content",
        replace_existing=True,
    )
    return scheduler
