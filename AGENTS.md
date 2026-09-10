# Social Media Connective — Development Notes

## Project Context
- Multi-tenant social media content management SaaS
- Admin/client roles with different Facebook OAuth configurations
- Supabase backend, Cloudflare Workers deployment
- Production: https://socmed.marketingconnective.com/

## Current State (September 2026)
- **Facebook App ID**: `1109449551768527`
- **Gemini AI**: `gemma-4-26b-a4b-it` (free, API key in .env)
- **Status**: All features running on Cloudflare Workers

## Key Architecture Decisions
1. **1 client = 1 manager model** (NOT multi-client per user)
2. **Role-based OAuth**: Admin uses config_id, Client uses standard OAuth
3. **Client ID format**: Sequential `S0100`, `S0101`, etc.
4. **Content filtering**: Dual fallback (`clientId` or `client.name`)
5. **Magic link**: Public client portal at `/client/$token`
6. **AI Provider**: Gemini API (free, no Ollama needed)
7. **Server-side routes**: All API routes run on Cloudflare Workers

## Facebook Login for Business
- Config ID: `2308260646667688` (Facebook Business Login)
- App ID: `1109449551768527` (Socmed Connective)
- Used for both Facebook and Instagram OAuth

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

## Common Issues
1. **"Fitur Tidak Tersedia"**: Facebook App Review not submitted
2. **Client sees admin's pages**: Wrong config_id used
3. **Token not saving**: Check postMessage + localStorage flow
4. **Content not showing**: Check clientId filter
5. **AI generation fails**: Check Gemini API key in .env
6. **Publish fails with "Invalid token"**: Token may have expired - reconnect Facebook
7. **Photo posts failing**: Ensure image URL is publicly accessible

## File Locations

### Frontend App
- OAuth files: `src/routes/api.auth.*.tsx`
- Webhook: `src/routes/api.webhook.instagram.tsx`
- Publishing: `src/routes/api.facebook.*.tsx`, `src/routes/api.instagram.*.tsx`
- Client detail: `src/routes/clients.$clientId.tsx`
- Content creation: `src/routes/content.create.tsx`
- Content store: `src/lib/content-store.ts`
- Supabase queries: `src/lib/db.ts`

### Database
- Migrations: `supabase/migrations/`
- Key tables: `content`, `clients`, `social_connections`

## Instagram Webhook Configuration
- **Webhook Endpoint**: `https://socmed.marketingconnective.com/api/webhook/instagram`
- **Verification Token**: `socmed_webhook_2026`
- **File**: `src/routes/api.webhook.instagram.tsx`
- **Status**: Created (needs deployment)

### Facebook Developer Console Setup
1. Buka: https://developers.facebook.com/apps/1109449551768527/instagram-graph-api/settings/
2. Cari **"Webhooks"**
3. Klik **"Callback URL"** → Isi: `https://socmed.marketingconnective.com/api/webhook/instagram`
4. Isi **"Verify Token"**: `socmed_webhook_2026`
5. Klik **"Verify and Save"**

## What Needs To Be Done Next
1. Register redirect URI for Instagram OAuth: `https://socmed.marketingconnective.com/api/auth/instagram-direct/callback`
2. Generate new token with `business_management` permission and test Manual Token flow
3. Fix Facebook App Settings (ToS URL, Data Deletion URL)
4. Add LinkedIn/X/Twitter support
5. Error notification system

## Credentials Reference
- Facebook App ID: `1109449551768527`
- Facebook App Secret: `42bc8519cc029ed1e79062a137d57b75`
- Instagram App ID: `2421970934879169` (Instagram Basic Display - not used for publishing)
- Instagram App Secret: `80572ef976b4d23ff4cc455af54763d1`
- Instagram Webhook Verify Token: `socmed_webhook_2026`
- Gemini API Key: `AIzaSyAgWl8TdaPheH71WDntMOPDtU-MF9kRh08`
- Gemini Model: `gemma-4-26b-a4b-it`
- Supabase URL: `https://jzwmgcldazvuoxvbmkzu.supabase.co`
- Supabase Anon Key: `sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n`
