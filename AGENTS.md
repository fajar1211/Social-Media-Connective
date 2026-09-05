# Social Media Connective — Development Notes

## Project Context
- Multi-tenant social media content management SaaS
- Admin/client roles with different Facebook OAuth configurations
- Supabase backend, Cloudflare Workers deployment
- Production: https://socmed.marketingconnective.com/
- AI Agent: Local Python/FastAPI service at localhost:8000

## Current State (September 2026)
- **Facebook App ID**: `1109449551768527` (new app)
- **Gemini AI**: `gemma-4-26b-a4b-it` (free, API key in .env)
- **Status**: AI agent working, Facebook publishing needs testing

## Key Architecture Decisions
1. **1 client = 1 manager model** (NOT multi-client per user)
2. **Role-based OAuth**: Admin uses config_id, Client uses standard OAuth
3. **Client ID format**: Sequential `S0100`, `S0101`, etc.
4. **Content filtering**: Dual fallback (`clientId` or `client.name`)
5. **Magic link**: Public client portal at `/client/$token`
6. **AI Provider**: Gemini API (free, no Ollama needed)
7. **Agent runs locally**: Not on Cloudflare (needs cron scheduler)

## Facebook Login for Business
- Admin config_id: `1015151248177076` (Connective User)
- Client: No config_id (standard OAuth)
- This allows clients to see their own pages, not admin's pages

## AI Agent Architecture
- **Engine**: FastAPI + APScheduler
- **AI**: Gemini API (`gemma-4-26b-a4b-it`) — free
- **Publisher**: Facebook Graph API v21.0, Instagram Graph API v21.0
- **Database**: Supabase (same as frontend)
- **Scheduler**: Checks every 60 seconds for approved content
- **Flow**: Create → Approve → Agent detects → AI generates caption → Publishes

## Important Commands

### Frontend
```powershell
# Dev server
cd "C:\Users\paula\Social Media Connective"
npx vite dev

# TypeScript check
npx tsc --noEmit --pretty

# Deploy
git add -A; git commit -m "message"; git push origin main
```

### AI Agent
```powershell
# Start agent
cd "C:\Users\paula\Social Media Connective\social-media-agent"
.\venv\Scripts\python.exe main.py

# Health check
Invoke-RestMethod -Uri "http://localhost:8000/health"

# AI generate
Invoke-RestMethod -Uri "http://localhost:8000/ai/generate" -Method POST -ContentType "application/json" -Body '{"topic":"...","platform":"Instagram"}'

# Validate a Facebook token
Invoke-RestMethod -Uri "http://localhost:8000/check-token" -Method POST -ContentType "application/json" -Body '{"page_access_token":"..."}'

# Exchange short-lived token for long-lived
Invoke-RestMethod -Uri "http://localhost:8000/exchange-token" -Method POST -ContentType "application/json" -Body '{"short_token":"..."}'

# Get page access token from user token
Invoke-RestMethod -Uri "http://localhost:8000/get-page-token" -Method POST -ContentType "application/json" -Body '{"user_token":"...","page_id":"..."}'

# Check client's Facebook token status
Invoke-RestMethod -Uri "http://localhost:8000/client-token-status/S0100"
```

## Common Issues
1. **"Fitur Tidak Tersedia"**: Facebook App Review not submitted
2. **Client sees admin's pages**: Wrong config_id used
3. **Token not saving**: Check postMessage + localStorage flow
4. **Content not showing**: Check clientId filter
5. **AI generation fails**: Check Gemini API key in .env
6. **Agent not publishing**: Check Facebook token is valid + page connected
7. **Publish fails with "Invalid token"**: Token may have expired - reconnect Facebook
8. **Photo posts failing**: Ensure image URL is publicly accessible

## File Locations

### Frontend App
- OAuth files: `src/routes/api.auth.*.tsx`
- Publishing: `src/routes/api.facebook.*.tsx`
- Client detail: `src/routes/clients.$clientId.tsx`
- Content creation: `src/routes/content.create.tsx`
- Content store: `src/lib/content-store.ts`
- Supabase queries: `src/lib/db.ts`

### AI Agent Service
- Entry point: `social-media-agent/main.py`
- AI engine: `social-media-agent/ai_engine.py`
- Publisher: `social-media-agent/publisher.py`
- Scheduler: `social-media-agent/scheduler.py`
- Config: `social-media-agent/.env`

### Database
- Migrations: `supabase/migrations/`
- Key tables: `content`, `clients`, `social_connections`, `publish_history`

## What's Been Done (Session 5 September 2026)
1. Built complete AI agent service (`social-media-agent/`)
2. Integrated Gemini AI for caption generation
3. Added "AI Generate Caption" button to content creation UI
4. Database migration for agent_status + publish_history
5. Tested: health check OK, AI generate OK
6. Pushed to GitHub (commit `eb1f369`)

## What's Been Done (Session 5 September 2026 - Facebook Publishing Fix)
1. Fixed Facebook OAuth callback to exchange user token → page access token
2. Added token validation in publisher.py before every publish
3. Added `/exchange-token` and `/get-page-token` endpoints to agent
4. Added `/client-token-status/{client_id}` endpoint for token health check
5. Fixed `handleApprove` in content-detail-overlay to use photo endpoint for image posts
6. Fixed page token storage in frontend (uses page.access_token, not user token)
7. Fixed auto-connect flow to use page access token
8. TypeScript errors fixed in modified files

## What Needs To Be Done Next
1. Connect Facebook to a client in dashboard
2. Test Facebook publishing end-to-end
3. Test Instagram 2-step publish
4. Fix Facebook App Settings (ToS URL, Data Deletion URL)
5. Add LinkedIn/X/Twitter support
6. Add error notifications
7. Token refresh mechanism

## Credentials Reference
- Facebook App ID: `1109449551768527`
- Facebook App Secret: `42bc8519cc029ed1e79062a137d57b75`
- Gemini API Key: `AIzaSyAgWl8TdaPheH71WDntMOPDtU-MF9kRh08`
- Gemini Model: `gemma-4-26b-a4b-it`
- Supabase URL: `https://jzwmgcldazvuoxvbmkzu.supabase.co`
- Supabase Anon Key: `sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n`
