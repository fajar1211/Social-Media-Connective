import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import AGENT_HOST, AGENT_PORT
from scheduler import create_scheduler, check_and_publish
from ai_engine import generate_caption, generate_hashtags, check_ollama_health
from supabase_client import (
    get_content_by_id,
    get_client,
    update_content_agent_status,
    mark_published,
    mark_failed,
    insert_publish_history,
    get_publish_history,
)
from publisher import check_facebook_token, validate_facebook_token, exchange_for_long_lived_token, get_page_access_token

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Scheduler started")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(
    title="Social Media Agent",
    description="AI-powered auto-post and scheduling agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────

@app.get("/health")
async def health():
    ollama_ok = await check_ollama_health()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
    }


# ── AI Generation ───────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str
    body: str = ""
    platform: str = "Facebook"
    tone: str = "professional"
    client_name: str = ""


@app.post("/ai/generate")
async def ai_generate(req: GenerateRequest):
    try:
        result = await generate_caption(
            topic=req.topic,
            body=req.body,
            platform=req.platform,
            tone=req.tone,
            client_name=req.client_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class HashtagRequest(BaseModel):
    topic: str
    platform: str = "Facebook"
    count: int = 10


@app.post("/ai/hashtags")
async def ai_hashtags(req: HashtagRequest):
    try:
        tags = await generate_hashtags(req.topic, req.platform, req.count)
        return {"hashtags": tags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Publish ─────────────────────────────────────────────

class PublishRequest(BaseModel):
    content_id: str


@app.post("/publish/{content_id}")
async def publish_content(content_id: str):
    """Manually trigger publish for a specific content item."""
    from scheduler import publish_single_content

    content = await get_content_by_id(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    try:
        await publish_single_content(content)
        updated = await get_content_by_id(content_id)
        return {"status": "ok", "content": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/publish/run")
async def publish_run():
    """Trigger the scheduler check manually."""
    try:
        await check_and_publish()
        return {"status": "ok", "message": "Publish check completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Token Check ─────────────────────────────────────────

class TokenCheckRequest(BaseModel):
    page_access_token: str


@app.post("/check-token")
async def check_token(req: TokenCheckRequest):
    result = await check_facebook_token(req.page_access_token)
    return result


class TokenExchangeRequest(BaseModel):
    short_token: str


@app.post("/exchange-token")
async def exchange_token(req: TokenExchangeRequest):
    """Exchange a short-lived user token for a long-lived user token."""
    result = await exchange_for_long_lived_token(req.short_token)
    return result


class PageTokenRequest(BaseModel):
    user_token: str
    page_id: str


@app.post("/get-page-token")
async def get_page_token(req: PageTokenRequest):
    """Get a page access token from a user token and page ID."""
    result = await get_page_access_token(req.user_token, req.page_id)
    return result


@app.get("/client-token-status/{client_id}")
async def client_token_status(client_id: str):
    """Check the token status for a client's Facebook integration."""
    client = await get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    social_ints = client.get("social_integrations", {})
    fb_integration = social_ints.get("Facebook", {})

    if not fb_integration or not fb_integration.get("connected"):
        return {"connected": False, "error": "Facebook not connected"}

    token = fb_integration.get("accessToken", "")
    if not token:
        return {"connected": True, "valid": False, "error": "No access token found"}

    validation = await validate_facebook_token(token)
    return {
        "connected": True,
        "valid": validation["valid"],
        "expires_in": validation["expires_in"],
        "scopes": validation["scopes"],
        "error": validation["error"],
        "page_id": fb_integration.get("selectedPageId", ""),
        "page_name": fb_integration.get("selectedPageName", ""),
    }


# ── History ─────────────────────────────────────────────

@app.get("/history")
async def history(content_id: str | None = None, limit: int = 50):
    try:
        records = await get_publish_history(content_id, limit)
        return {"history": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Status ──────────────────────────────────────────────

@app.get("/status/{content_id}")
async def content_status(content_id: str):
    content = await get_content_by_id(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return {
        "id": content["id"],
        "status": content.get("status"),
        "agent_status": content.get("agent_status"),
        "published_at": content.get("published_at"),
        "notes": content.get("notes"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=AGENT_HOST, port=AGENT_PORT, reload=True)
