# Social Media Agent

AI-powered auto-post and scheduling agent for Social Media Connective. Runs on local server, 100% free.

## Features

- **Auto-Scheduler** — Checks for approved content every 60 seconds and publishes automatically
- **AI Caption Generator** — Generates captions and hashtags using Ollama (local LLM)
- **Multi-Platform Publisher** — Facebook Posts, Facebook Photos, Instagram Media
- **Publish History** — Full audit trail of all publishing attempts
- **Error Handling** — Retry logic, error logging, status tracking
- **Token Validation** — Check Facebook token expiry before publishing

## Prerequisites

1. **Python 3.10+**
2. **Ollama** — Local AI engine
3. **Supabase** — Existing database (already configured)

## Quick Start

### 1. Install Ollama

```bash
# Windows
winget install Ollama.Ollama

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull AI Model

```bash
ollama pull gemma2:9b
```

Other good options:
- `llama3.1:8b` — Better for English content
- `qwen2.5:7b` — Good multilingual support
- `phi3:mini` — Fastest, lighter on resources

### 3. Setup Agent

```bash
cd social-media-agent

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure
copy .env.example .env
# Edit .env with your Supabase key and FB app secret
```

### 4. Run

```bash
# Start Ollama (in separate terminal)
ollama serve

# Start agent
python main.py
```

Agent runs at `http://localhost:8000`

### 5. Run Database Migration

Go to Supabase SQL Editor and run:
```
supabase/migrations/20260904000000_add_agent_and_publish_history.sql
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (Ollama status) |
| POST | `/ai/generate` | Generate caption + hashtags via AI |
| POST | `/ai/hashtags` | Generate hashtags only |
| POST | `/publish/{content_id}` | Manually publish a content item |
| POST | `/publish/run` | Trigger scheduler check manually |
| POST | `/check-token` | Validate Facebook access token |
| GET | `/history` | Get publish history |
| GET | `/status/{content_id}` | Get content publish status |

## How It Works

```
1. Admin creates content in UI → status "Suggested"
2. Admin approves → status "Approved"
3. Agent scheduler (every 60s) detects approved content
4. Agent reads client's social integration (FB/IG token)
5. Agent publishes to the platform
6. Agent updates status to "Published" + logs to publish_history
```

## UI Integration

The content creation page now has an **"AI Generate Caption"** button below the body textarea. It calls the agent to generate a caption and hashtags based on the topic, body, and platform.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase anon key |
| `FB_APP_ID` | `1109449551768527` | Facebook App ID |
| `FB_APP_SECRET` | — | Facebook App Secret |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gemma2:9b` | AI model to use |
| `AGENT_PORT` | `8000` | Agent server port |
| `SCHEDULE_CHECK_INTERVAL` | `60` | Seconds between scheduler checks |
