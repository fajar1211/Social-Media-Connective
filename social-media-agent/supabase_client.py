import httpx
from datetime import datetime, timezone
from config import SUPABASE_URL, SUPABASE_KEY


HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


async def get_content_ready_to_publish() -> list[dict]:
    """Get content with status 'Approved' that is ready to be published."""
    now = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            params={
                "status": "eq.Approved",
                "or": f"(agent_status.is.null,agent_status.eq.pending,agent_status.eq.failed)",
                "order": "created_at.asc",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_scheduled_content_ready() -> list[dict]:
    """Get content with status 'Approved' and scheduled_date <= now."""
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            params={
                "status": "eq.Approved",
                "scheduled_date": f"lte.{today}",
                "or": f"(agent_status.is.null,agent_status.eq.pending,agent_status.eq.failed)",
                "order": "created_at.asc",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_content_by_id(content_id: str) -> dict | None:
    """Get a single content item by ID."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            params={"id": f"eq.{content_id}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data[0] if data else None


async def update_content_status(content_id: str, status: str, **extra):
    """Update content status and optional extra fields."""
    patch = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    patch.update(extra)
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            json=patch,
            params={"id": f"eq.{content_id}"},
        )
        resp.raise_for_status()
        return resp.json()


async def update_content_agent_status(content_id: str, agent_status: str):
    """Update only the agent_status field."""
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            json={"agent_status": agent_status, "updated_at": datetime.now(timezone.utc).isoformat()},
            params={"id": f"eq.{content_id}"},
        )
        resp.raise_for_status()
        return resp.json()


async def mark_published(content_id: str, platform: str, post_id: str):
    """Mark content as published and record the platform post ID."""
    now = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            json={
                "status": "Approved",
                "agent_status": "published",
                "published_at": now,
                "notes": f"[Published to {platform}] Post ID: {post_id}",
                "updated_at": now,
            },
            params={"id": f"eq.{content_id}"},
        )
        resp.raise_for_status()
        return resp.json()


async def mark_failed(content_id: str, error_message: str):
    """Mark content as failed."""
    now = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/content",
            headers=HEADERS,
            json={
                "agent_status": "failed",
                "notes": f"[Agent Error] {error_message}",
                "updated_at": now,
            },
            params={"id": f"eq.{content_id}"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_client(client_id: str) -> dict | None:
    """Get client by ID."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/clients",
            headers=HEADERS,
            params={"id": f"eq.{client_id}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data[0] if data else None


async def insert_publish_history(
    content_id: str,
    client_id: str,
    platform: str,
    post_id: str,
    status: str,
    error_message: str = "",
):
    """Insert a publish history record."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/publish_history",
            headers=HEADERS,
            json={
                "content_id": content_id,
                "client_id": client_id,
                "platform": platform,
                "post_id": post_id,
                "status": status,
                "error_message": error_message,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_publish_history(content_id: str | None = None, limit: int = 50) -> list[dict]:
    """Get publish history, optionally filtered by content_id."""
    params = {"order": "created_at.desc", "limit": str(limit)}
    if content_id:
        params["content_id"] = f"eq.{content_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/publish_history",
            headers=HEADERS,
            params=params,
        )
        resp.raise_for_status()
        return resp.json()
