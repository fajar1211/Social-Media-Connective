# Social Media Connective — Project Status

## Project Overview
- **Repository**: https://github.com/fajar1211/Social-Media-Connective
- **Production**: https://socmed.marketingconnective.com/
- **Tech Stack**: TanStack Start (React 19), TanStack Router, Tailwind CSS v4, shadcn/ui, Cloudflare Workers
- **Deployment**: Cloudflare Workers (auto-deploy from GitHub `main` branch via `bun run build` + `npx wrangler deploy`)
- **Last Updated**: 2 September 2026

---

## 🔑 Facebook Developer Console

| Item | Value |
|------|-------|
| **App ID** | `1109449551768527` |
| **App Secret** | `42bc8519cc029ed1e79062a137d57b75` |
| **App Name** | Social Media Connective |
| **App Mode** | **Published (Live)** ✅ |
| **Privacy Policy** | `https://socmed.marketingconnective.com/privacy` ✅ |
| **Redirect URIs** | `https://socmed.marketingconnective.com/api/auth/facebook/callback` ✅ |
| | `https://socmed.marketingconnective.com/api/auth/instagram/callback` ✅ |

### Facebook Login for Business Config IDs
| Config ID | Name | Used For |
|-----------|------|----------|
| `1015151248177076` | Connective User | **Admin** role OAuth |
| `2576054396179955` | Connective Admin | **Client** role (UNUSED - causing issues) |

### App Review Status
| Permission | Status | Action Needed |
|------------|--------|---------------|
| `pages_show_list` | Siap untuk pengujian | Submit for review |
| `pages_read_engagement` | Siap untuk pengujian | Submit for review |
| `pages_manage_posts` | Siap untuk pengujian | Submit for review |
| `business_management` | Siap untuk pengujian | Submit for review |
| `public_profile` | Siap untuk pengujian | Auto-approved |
| `email` | Siap untuk pengujian | Auto-approved |

**⚠️ CRITICAL: All permissions are in "Ready for testing" status. Must submit for App Review before non-developer users can connect.**

---

## 📊 Current Issue: Facebook Login for Client Role

### Problem
- **Admin** can connect Facebook ✅ (developer of the app)
- **Client** gets "Fitur Tidak Tersedia" ❌ (not a developer + permissions not approved)

### Root Cause Analysis
1. App is **Published (Live)** ✅
2. Redirect URIs are correctly configured ✅
3. Facebook Login for Business settings are correct ✅
4. **BUT** all permissions are in "Siap untuk pengujian" (Ready for testing) status ❌
5. This means only developers/testers can authenticate
6. Non-developer users (clients) are blocked

### Solution Implemented
- **Admin**: Uses `config_id: "1015151248177076"` (Login for Business)
- **Client**: No `config_id` (Standard OAuth) — sees their own pages, not admin's pages

### Remaining Blocker
**App Review must be submitted and approved** for client role to work.

---

## 📝 Files Modified (2 September 2026)

### 1. `src/routes/api.auth.facebook.tsx`
- Reads `role` parameter from query string
- Admin → `config_id: "1015151248177076"` (Login for Business)
- Client → no `config_id` (Standard OAuth)
- Graph API updated to `v21.0`

### 2. `src/routes/api.auth.facebook.callback.tsx`
- Graph API updated to `v21.0`
- Popup close delay: 3000ms (prevents race condition)

### 3. `src/routes/api.auth.instagram.tsx`
- Graph API updated to `v21.0`
- Removed `auth_type: "reauthenticate"`

### 4. `src/routes/api.auth.instagram.callback.tsx`
- Graph API updated to `v21.0`

### 5. `src/routes/clients.$clientId.tsx`
- Added `useAuth` import
- SettingsTab passes `role` parameter to Facebook OAuth URL

### 6. `src/routes/platforms.tsx`
- Passes `role` parameter to OAuth URL

### 7. All Facebook API endpoints
- Updated from `v19.0` to `v21.0`:
  - `api.facebook.post.tsx`
  - `api.facebook.photo.tsx`
  - `api.facebook.schedule.tsx`
  - `api.facebook.edit.tsx`
  - `api.facebook.delete.tsx`

---

## 📋 App Review Submission Files

| File | Purpose |
|------|---------|
| `APP_REVIEW_DESCRIPTION.md` | Complete documentation for App Review |
| `APP_REVIEW_SUBMISSION.txt` | Short version for form submission |

### User Action Required
1. Go to `https://developers.facebook.com/apps/1109449551768527/app-review/`
2. Open "Kelola Halaman" use case
3. Click "Kirim untuk Tinjauan"
4. Copy content from `APP_REVIEW_SUBMISSION.txt`
5. Upload video/screenshot of app usage
6. Submit and wait 1-7 days for approval

---

## ✅ Completed Features

### 1. Client Management (`/clients`)
- Search + filter bar
- Responsive table (desktop) + card (mobile)
- Dropdown menu: View / Edit / Delete
- Edit dialog: Client ID + Name + Active toggle
- Add Client dialog: Client ID + Name (auto-generated S-prefixed IDs)
- Delete with AlertDialog confirmation
- Status badge (Active/Inactive)
- Entire row clickable for navigation

### 2. Client Detail (`/clients/$clientId`)
**Tab Structure (5 tabs):**
- **Content Tab**: Status cards, Import section, ContentList with clientIdFilter
- **AI Content Tab**: Post about, campaign image, reference doc/url, knowledge notes
- **Media Tab**: Grid view, select all/delete selected, add images
- **Settings Tab**: Social Integration cards, Magic Link management
- **Account Tab**: Username/Password form, Google Sign-In button (UI only)

### 3. Social Integration OAuth
- **Facebook OAuth**: Role-based config_id selection
- **Instagram OAuth**: Standard flow
- Popup flow with `postMessage` + localStorage fallback
- Token stored per-client in `socialIntegrations`

### 4. Facebook Content Publishing APIs
| Endpoint | Method | Function |
|----------|--------|----------|
| `/api/facebook/post` | POST | Publish text/link to Facebook Page |
| `/api/facebook/photo` | POST | Publish image to Facebook Page |
| `/api/facebook/schedule` | POST | Schedule post with datetime |
| `/api/facebook/edit` | POST | Edit existing Facebook post |
| `/api/facebook/delete` | POST | Delete Facebook post |

### 5. Content Creation (`/content/create`)
- Auto-select client from URL params
- Connected platforms shown first
- Publish Now / Schedule For Later options
- Complete world timezone list

### 6. Magic Link System
- Public client portal at `/client/$token`
- No auth required for client viewing
- Copy/Regenerate/Pause controls in Settings

### 7. Landing Page
- Animated orbs, gradient shimmer, marquee
- Scroll animations, animated counters
- Footer with "Powered by Marketing Connective"

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/content-store.ts` | Store: types, actions, content management |
| `src/lib/db.ts` | Supabase queries, magic link functions |
| `src/lib/auth.tsx` | AuthProvider, profile management |
| `src/routes/clients.$clientId.tsx` | Client detail with all tabs (~1860 lines) |
| `src/routes/content.create.tsx` | Content creation page |
| `src/routes/api.auth.facebook.tsx` | Facebook OAuth with role-based config |
| `src/routes/api.auth.facebook.callback.tsx` | Facebook OAuth callback |
| `src/routes/api.auth.instagram.tsx` | Instagram OAuth |
| `src/routes/api.auth.instagram.callback.tsx` | Instagram OAuth callback |
| `src/routes/privacy.tsx` | Public privacy policy page |
| `src/routes/client.$token.tsx` | Public client portal |
| `supabase/migrations/` | Database migrations |

---

## ⏳ Pending / Next Steps

### 🔴 CRITICAL (Blocker)
- [ ] **Submit Facebook App Review** — required for client role to work
- [ ] **Wait for Facebook approval** — 1-7 days

### 🟡 HIGH Priority
- [ ] Content Calendar View
- [ ] Dashboard with analytics
- [ ] Token refresh (handle expired Facebook/Instagram tokens)
- [ ] Instagram Graph API posting

### 🟢 MEDIUM Priority
- [ ] YouTube Data API integration
- [ ] Google Business Profile (GBP) posting
- [ ] LinkedIn API integration
- [ ] TikTok API integration
- [ ] Bulk publish
- [ ] One post → multiple platforms

### ⚪ LOW Priority
- [ ] Analytics insights from published posts
- [ ] Content preview before publish
- [ ] Pricing tiers (Free / Pro / Business)

---

## 🚀 Dev Commands

```powershell
# Start dev server
powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\paula\Social Media Connective'; npx vite dev"

# TypeScript check
npx tsc --noEmit --pretty

# Push to git (auto-deploys to Cloudflare)
git add -A; git commit -m "message"; git push origin main
```

---

## 📝 Recent Changes (2 September 2026)

1. ✅ Facebook OAuth: Role-based config_id (admin vs client)
2. ✅ Client sees own pages, not admin's pages
3. ✅ Graph API updated v19.0 → v21.0 (all endpoints)
4. ✅ Removed `auth_type: "reauthenticate"` from Instagram OAuth
5. ✅ Added `useAuth` to SettingsTab for role detection
6. ✅ Created App Review description files
7. ✅ Diagnosed root cause: permissions not approved for non-developers
8. ⏳ Waiting for user to submit App Review
