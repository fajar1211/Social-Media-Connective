# Social Media Connective — Project Status

## Project Overview
- **Repository**: https://github.com/fajar1211/Social-Media-Connective
- **Production**: https://socmed.marketingconnective.com/
- **Tech Stack**: TanStack Start (React 19), TanStack Router, Tailwind CSS v4, shadcn/ui, Cloudflare Workers
- **Deployment**: Cloudflare Workers (auto-deploy from GitHub `main` branch)
- **Last Updated**: 5 September 2026

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│      Social Media Connective App        │
│    (Cloudflare Workers - Production)     │
│                                         │
│  content.create.tsx → AI Generate btn   │
│         ↓ POST http://localhost:8000    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│     AI Agent Service (Local Server)     │
│         localhost:8000                   │
│                                         │
│  FastAPI + APScheduler + Gemini AI      │
│  Publisher: Facebook/Instagram Graph API │
└─────────────────────────────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │   Supabase    │
            │  (Database)   │
            └──────────────┘
```

---

## ✅ Completed Features

### 1. Frontend App (Cloudflare Workers)
- Client Management (`/clients`)
- Client Detail with Tabs (Content, AI Content, Media, Settings, Account)
- Social Integration OAuth (Facebook + Instagram)
- Content Creation with AI Generate Caption button
- Facebook Publishing APIs (Post, Photo, Schedule, Edit, Delete)
- Magic Link System (Public client portal)
- Landing Page + Privacy Policy Page
- Dashboard, Analytics, Calendar, Templates, Export, Import, Settings

### 2. AI Agent Service (`social-media-agent/`)
- **AI Caption Generator** — Gemini API (`gemma-4-26b-a4b-it`) — 100% free
- **Auto-Scheduler** — APScheduler, checks every 60 seconds
- **Facebook Publisher** — Text post, Photo, Scheduled post
- **Instagram Publisher** — 2-step media container → publish
- **Publish History** — Audit trail in Supabase
- **Error Handling** — Retry logic, status tracking, error logging
- **Token Validation** — Check Facebook token expiry
- 7 API endpoints at `localhost:8000`

### 3. Database (Supabase)
- Tables: `profiles`, `clients`, `content`, `social_connections`, `platforms`, `publish_history`
- Agent columns on content: `published_at`, `platform_post_ids`, `agent_status`
- RLS policies for admin access

---

## 🔑 Credentials

### Facebook Developer Console
| Item | Value |
|------|-------|
| **App ID** | `1109449551768527` |
| **App Secret** | `42bc8519cc029ed1e79062a137d57b75` |
| **Client Token** | `fbe4dbe7441f202984e89b534ea56530` |
| **App Name** | Socmed Connective |
| **App Type** | Business |

### Gemini AI (Free)
| Item | Value |
|------|-------|
| **API Key** | `AIzaSyAgWl8TdaPheH71WDntMOPDtU-MF9kRh08` |
| **Model** | `gemma-4-26b-a4b-it` |

### Supabase
| Item | Value |
|------|-------|
| **URL** | `https://jzwmgcldazvuoxvbmkzu.supabase.co` |
| **Anon Key** | `sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n` |

### Facebook Login for Business
| Role | config_id |
|------|-----------|
| Admin | `1015151248177076` (Connective User) |
| Client | No config_id (Standard OAuth) |

---

## 🔴 Current Issues

### 1. Facebook App Review Belum Disubmit
- App hanya punya permission `email` + `public_profile`
- Permission `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management` belum ada
- Error: `"Fitur Tidak Tersedia"` (error_code 1349186)

### 2. Alternatif: Server-Side Token (Dipilih)
- Client generate Page Access Token dari Graph API Explorer
- Token disimpan di database per client
- App publish langsung dengan token client
- **Tidak perlu App Review**

### 3. Instagram Posting API Belum Teruji
- Flow Instagram butuh 2-step (create container → publish)
- Sudah diimplementasi di `publisher.py` tapi belum tested end-to-end

---

## 📋 Yang Sudah Dikerjakan (5 September 2026)

1. ✅ SQL migration: `agent_status` column + `publish_history` table
2. ✅ Python agent service: `social-media-agent/` (10 files)
3. ✅ AI Engine: Support Gemini API (gratis, tanpa Ollama)
4. ✅ Publisher: Facebook + Instagram Graph API
5. ✅ Scheduler: APScheduler auto-publish tiap 60 detik
6. ✅ UI Integration: Tombol "AI Generate Caption" di content creation
7. ✅ `.env` configured dengan credentials
8. ✅ Python venv + dependencies installed
9. ✅ Agent tested: health check OK, AI generate OK
10. ✅ Pushed to GitHub (commit `eb1f369`)

---

## ⏳ Yang Perlu Dilanjutkan

### Prioritas 1: Facebook Publishing
1. **Connect Facebook** ke client di dashboard (Social Integration tab)
2. **Generate Page Access Token** dari Graph API Explorer
3. **Test publish** via agent: `POST http://localhost:8000/publish/{content_id}`
4. Fix Terms of Service URL + Data Deletion URL di Facebook Developer Console

### Prioritas 2: Test End-to-End Flow
1. Create content di UI → approve → lihat agent auto-publish
2. Test Facebook post, photo, schedule
3. Test Instagram 2-step publish
4. Verify publish_history entries

### Prioritas 3: Multi-Platform
1. Add LinkedIn posting API
2. Add X/Twitter posting API
3. Add TikTok posting API
4. Add platform selector di UI

### Prioritas 4: Production Hardening
1. Token refresh mechanism (Facebook token expired 60 hari)
2. Error notification system (email/Telegram alert on failure)
3. Rate limiting per client
4. Content queue management

---

## 📁 Key Files

### Frontend App
| File | Purpose |
|------|---------|
| `src/routes/content.create.tsx` | Content creation + AI Generate button |
| `src/routes/clients.$clientId.tsx` | Client detail (~1860 lines) |
| `src/routes/api.auth.facebook.tsx` | Facebook OAuth |
| `src/routes/api.auth.facebook.callback.tsx` | Facebook callback |
| `src/routes/api.auth.instagram.tsx` | Instagram OAuth |
| `src/routes/api.facebook.post.tsx` | Facebook post API |
| `src/routes/api.facebook.photo.tsx` | Facebook photo API |
| `src/routes/api.facebook.schedule.tsx` | Facebook schedule API |
| `src/lib/content-store.ts` | Store: types, actions |
| `src/lib/db.ts` | Supabase queries |
| `src/lib/auth.tsx` | AuthProvider |

### AI Agent Service
| File | Purpose |
|------|---------|
| `social-media-agent/main.py` | FastAPI app (7 endpoints) |
| `social-media-agent/ai_engine.py` | Gemini AI caption/hashtag generator |
| `social-media-agent/publisher.py` | Facebook/Instagram Graph API publisher |
| `social-media-agent/scheduler.py` | APScheduler cron jobs |
| `social-media-agent/supabase_client.py` | Supabase queries |
| `social-media-agent/config.py` | Environment variables |
| `social-media-agent/.env` | Secrets (keys, tokens) |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/20260904000000_add_agent_and_publish_history.sql` | Agent columns + history table |

---

## 🚀 Dev Commands

```powershell
# Start frontend dev server
cd "C:\Users\paula\Social Media Connective"
npx vite dev

# Start AI agent
cd "C:\Users\paula\Social Media Connective\social-media-agent"
.\venv\Scripts\python.exe main.py

# TypeScript check
npx tsc --noEmit --pretty

# Push to git (auto-deploys)
git add -A; git commit -m "message"; git push origin main
```

### Agent API
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:8000/health"

# AI generate caption
Invoke-RestMethod -Uri "http://localhost:8000/ai/generate" -Method POST -ContentType "application/json" -Body '{"topic":"...","platform":"Instagram"}'

# Manual publish trigger
Invoke-RestMethod -Uri "http://localhost:8000/publish/run" -Method POST

# Check publish history
Invoke-RestMethod -Uri "http://localhost:8000/history"
```

---

## 🎯 Target

1. **Minggu ini**: Test Facebook publishing end-to-end
2. **Minggu depan**: Multi-platform support (LinkedIn, X/Twitter)
3. **2 minggu lagi**: Production ready dengan error handling + notifications
