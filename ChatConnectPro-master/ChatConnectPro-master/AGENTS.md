# Project Context — ChatConnect Pro

## IMPORTANT: Live Production System
Project ini sudah **live di production**:
- **Backend**: Railway (`https://chatconnectpro-production.up.railway.app/`)
- **Frontend**: Cloudflare Workers (domain terpisah)
- **CI/CD**: GitHub `master` → auto-deploy Railway (backend) + Cloudflare (frontend)
- **Database**: Supabase (production)

Semua perubahan kode harus langsung di-commit & push ke `origin/master` agar segera live.
**Jangan pernah mengasumsikan environment lokal** — selalu verifikasi ke endpoint live Railway.

## Overview
Multi-tenant WhatsApp bot system. Setiap user memiliki instance WhatsApp sendiri yang terisolasi.

## Current Live Instance
- Instance ID: `338af254-1b3c-4d6d-ac3d-a8107cb5eb65`
- Nomor: **6285600001993**
- Status: **connected** (auto-restore dari Supabase `bot_auth_store`)
- Legacy bot: **stopped** (tidak digunakan)

## Key Architecture
| Layer | Tech |
|---|---|
| Frontend | TanStack Start + Vite (Cloudflare Workers) |
| Backend (bot) | Express + Baileys (Railway, port 3000) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (Google OAuth + Email) |
| Multi-instance | Supabase `bot_auth_store` (bukan file system — Railway ephemeral) |

## Database
- `bot_chats` — RLS DISABLED (public read)
- `bot_instances` — RLS ENABLED (user_id = auth.uid())
- `bot_scheduled` — RLS ENABLED; scheduler baca pakai SERVICE_ROLE_KEY
- `bot_auth_store` — Auth credentials per instance (supaya session survive Railway restart)

## Bug Fixes Applied (cumulative)
1. **Auth middleware** — `jsonwebtoken.verify()` → `supabase.auth.getUser(token)`
2. **RLS violation** — Semua route `/api/bot/*` pakai `getAuthedClient(req.userToken!)`
3. **Instance auto-restore** — `restoreInstances()` dari `bot_auth_store` (bukan folder `wa_auth/`)
4. **Supabase auth state** — Batch DELETE+INSERT untuk key store (cegah pre-key upload timeout)
5. **Duplicate row handling** — `.maybeSingle()` + unique index di `bot_auth_store` + batch delete-then-insert
6. **Migration SQL embedded** — File `supabase-migration.sql` di-embed ke code (hindari `ENOENT` di Railway)
7. **Scheduler retry** — Pesan tidak langsung "failed" saat instance belum `connected`; di-retry tiap 15 detik

## Scheduled Messages Fix
**Root cause**: Setelah Railway restart, `startScheduler()` jalan sebelum instance benar-benar `connected`.
Scheduler langsung mark "failed" tanpa retry.

**Fix** (`wa-bot-server/src/scheduler.ts`):
- `trySend()` cek `s.bot === "connected"` sebelum kirim
- Jika belum ada instance connected → pesan tetap `pending` (di-retry 15 detik kemudian)
- Jika instance sudah connected tapi gagal → mark `failed` (permanent failure)
- Instance masih `initializing` → skip, retry nanti

## Monitoring
- `GET /api/monitoring/health` — public, cek uptime, memori, status instance
- `GET /` — public, cek status bot (`connected`/`stopped`) + nomor

## Verification Commands
```powershell
# Cek status server
Invoke-RestMethod https://chatconnectpro-production.up.railway.app/

# Cek health + instance detail
Invoke-RestMethod https://chatconnectpro-production.up.railway.app/api/monitoring/health

# Query scheduled messages via Supabase REST
$headers = @{apikey="..."; Authorization="Bearer SRK"}
Invoke-RestMethod -Uri "https://[project].supabase.co/rest/v1/bot_scheduled?select=id,status" -Headers $headers
```

## File Reference
- `wa-bot-server/src/bot-manager.ts` — Multi-socket manager
- `wa-bot-server/src/supabase-auth.ts` — Supabase-based auth state (batched writes)
- `wa-bot-server/src/scheduler.ts` — Scheduler with retry logic
- `wa-bot-server/src/migrate.ts` — Auto-migration (embedded SQL, no file read)
- `wa-bot-server/src/index.ts` — Main server entry point
- `wa-bot-server/src/supabase.ts` — Supabase client (service role key)
- `wa-bot-server/src/whatsapp.ts` — Legacy single-tenant bot (tidak aktif)
- `wa-bot-server/src/routes/profile.ts` — Backend API: GET/PUT /api/admin/profile + POST /api/admin/profile/logo
- `wa-bot-server/src/routes/admin-users.ts` — Backend API: GET /api/admin/users (list, delete admin users)
- `src/lib/api.ts` — Frontend API client
- `src/lib/auth.ts` — Auth functions: login, signup, profile CRUD, logo upload, display name/password update
- `src/routes/pengaturan.tsx` — Scheduled message UI
- `src/routes/otomatisasi.tsx` — Renamed from pengaturan (route /otomatisasi)
- `src/routes/pengaturan.tsx` — New settings: change display name & password (Supabase Auth)
- `src/routes/profil.tsx` — Business profile: logo upload, info bisnis, kontak & alamat
- `src/routes/percakapan.tsx` — Chat conversations
- `src/routes/backend/index.tsx` — /backend redirect (spinner → dashboard if authed, login if not)
- `src/routes/backend/login.tsx` — Admin login portal (email/password, Supabase Auth)
- `src/routes/backend/dashboard.tsx` — Admin dashboard (stats, user mgmt, instance monitoring, system info)
- `src/components/app-sidebar.tsx` — Sidebar nav (Otomatisasi, Pengaturan, Admin)
- `src/components/app-header.tsx` — Header: page titles, Profil/Pengaturan dropdown, logo avatar

## Recent Changes (Session 2026-06-03)

### Profile Management
- **Route rename**: `/pengaturan` (old settings) → `/otomatisasi`, route & sidebar updated
- **New `/pengaturan`**: Ganti nama (display name) + ganti password via Supabase Auth
- **New `/profil`**: Upload logo perusahaan (via backend API → Supabase Storage), business info (nama bisnis, PIC), contact & address (email, phone, address)
- **Logo on header**: AvatarImage shows logo_url when available, else initials fallback
- **JSONB merge fix**: PUT /api/admin/profile reads existing data before upsert to prevent field overwrite

### Admin Backend Panel
- **`/backend/login`**: Dedicated admin login page (branded UI, email/password)
- **`/backend/dashboard`**: Stats cards, user management table, instance monitoring, system info
- **`/backend`**: Auto-redirects to dashboard (if authed) or login (if not)
- **Route structure**: Semua backend routes flat di root (bukan nested children), di-generate otomatis oleh TanStack Router dari folder `routes/backend/`

### Known Issues / Next Steps
- Admin users hanya bisa ditambahkan via **Supabase Dashboard** → Authentication → Users → Add User (tidak ada halaman signup backend)
- Profile data disimpan di `bot_auth_store` sebagai JSONB (instance_id=userId, filename='profile')
- Logo upload via backend API (service role) untuk hindari RLS/bucket-permission issues
- Perlu testing persistensi profile setelah hard refresh
- Perlu testing logo replace initials di avatar header setelah upload

## Session 2026-06-04 — Instagram Integration (Manual Entry)

### Summary
Percobaan OAuth Login with Facebook gagal karena Facebook Developer App tidak bisa diverifikasi (error `PLATFORM__INVALID_APP_ID`). Solusi: kembali ke manual entry via **Graph API Explorer**.

### Instagram — Manual Connect
- Dialog Instagram sekarang hanya 4 field: **Page ID, Access Token, IG User ID, Verify Token**
- Ada `<details>` collapse dengan panduan langkah demi langkah
- Link langsung ke Graph API Explorer: `https://developers.facebook.com/tools/explorer/`
- **Flow**: Get Page Access Token → salin Page ID + token → cek IG Business Account via API → salin IG User ID → isi semua + Verify Token → Simpan
- **Webhook**: Callback URL → `https://chatconnectpro-production.up.railway.app/webhook/instagram` (setting manual di Facebook Dev App → Instagram → Webhook)

### Files Changed
| File | Perubahan |
|---|---|
| `wa-bot-server/src/routes/facebook-oauth.ts` | **DIHAPUS** — OAuth flow tidak dipakai |
| `wa-bot-server/src/index.ts` | Hapus import & register facebookOAuthRoutes |
| `src/lib/api.ts` | Hapus `initInstagramOAuth()` |
| `src/components/integrations-panel.tsx` | Hapus OAuth UI (Login with Facebook, App ID, App Secret, postMessage listener), tambah panduan Graph API Explorer |

### Yang Bisa Dilanjutkan Nanti
- **Opsi Meta App terpusat** — buat 1 Facebook App milik ChatConnect yang disertifikasi Meta (review ~2-6 minggu). User tinggal klik Login with Facebook tanpa setup sendiri.
- **Token auto-refresh** — Page Access Token kadaluarsa ~60 hari, perlu mekanisme refresh
- **Messenger** — sudah ada backend & UI manual, tinggal connect dengan cara yang sama (Page ID + Token + Verify Token + App Secret)
