import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jzwmgcldazvuoxvbmkzu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

FB_APP_ID = os.getenv("FB_APP_ID", "1109449551768527")
FB_APP_SECRET = os.getenv("FB_APP_SECRET", "")
FB_GRAPH_VERSION = "v21.0"
FB_GRAPH_BASE = f"https://graph.facebook.com/{FB_GRAPH_VERSION}"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:9b")

AGENT_HOST = os.getenv("AGENT_HOST", "0.0.0.0")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8000"))

SCHEDULE_CHECK_INTERVAL = int(os.getenv("SCHEDULE_CHECK_INTERVAL", "60"))
PUBLISH_MAX_RETRIES = int(os.getenv("PUBLISH_MAX_RETRIES", "3"))
