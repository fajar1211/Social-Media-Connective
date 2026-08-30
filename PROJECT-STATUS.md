# Social Media Connective — Project Status

## Project Overview
- **Repository**: https://github.com/fajar1211/Social-Media-Connective
- **Production**: https://socmedconnective.marketingconnective.com/
- **Tech Stack**: TanStack Start (React 19), TanStack Router, Nitro, Tailwind CSS v4, shadcn/ui, Vite 8
- **Dev Server**: `npx vite dev` on port 8080
- **PowerShell**: Need `-ExecutionPolicy Bypass` prefix
- **Deployment**: Cloudflare Workers (auto-deploy from GitHub `main` branch)
- **Last Updated**: 31 August 2026

---

## ✅ Completed Features

### 1. Client Management (`/clients`)
- Search + filter bar
- Responsive table (desktop) + card (mobile)
- Dropdown menu: View / Edit / Delete (Manage Platforms & Social Integration removed from dropdown)
- Edit dialog: Client ID + Name + Active toggle
- Add Client dialog: Client ID + Name
- Delete with AlertDialog confirmation
- Status badge (Active/Inactive)
- Entire row clickable for navigation

### 2. Client Detail (`/clients/$clientId`)
**Tab Structure (5 tabs):**
- **Content Tab**: Status cards (Suggested/Additional/Submitted/Approved/Deleted), Import section (.docx/.pdf/.md), ContentList
- **AI Content Tab**: Post about, campaign image, reference doc/url, knowledge notes, knowledge files, posts per platform, schedule dates
- **Media Tab**: Grid view, select all/delete selected, add images, filter all/images/videos
- **Settings Tab**: Social Integration cards with professional SVG logos per platform
- **Account Tab**: Username/Password form, Google Sign-In button (UI only)

**Social Platforms:**
- Connected: Facebook, Instagram
- Coming Soon: YouTube, GBP, LinkedIn, TikTok, Xiaohongshu, Reddit, Threads, X (Twitter)
- Blog (WordPress)

### 3. Social Integration OAuth (Facebook & Instagram)
- **Facebook OAuth**: `/api/auth/facebook` → redirect to Meta → `/api/auth/facebook/callback`
- **Instagram OAuth**: `/api/auth/instagram` → redirect to Meta → `/api/auth/instagram/callback`
- Meta App ID: `1513088904188454`
- Callback URL: `https://socmedconnective.marketingconnective.com/api/auth/facebook/callback`
- Scopes: `business_management`, `pages_read_engagement`, `pages_manage_posts`
- `auth_type=reauthenticate` → force different accounts per client
- `state` parameter = `clientId` → prevents cross-client token save
- Popup flow with `postMessage` communication
- Token stored in `SocialConnection.accessToken`, `pages` stored per-client
- Facebook OAuth tested and working (6 pages found)

### 4. Facebook Content Publishing APIs
| Endpoint | Method | Function |
|----------|--------|----------|
| `/api/facebook/post` | POST | Publish text/link to Facebook Page |
| `/api/facebook/photo` | POST | Publish image to Facebook Page |
| `/api/facebook/schedule` | POST | Schedule post with datetime |
| `/api/facebook/edit` | POST | Edit existing Facebook post |
| `/api/facebook/delete` | POST | Delete Facebook post |

### 5. Content Creation (`/content/create`)
- **URL Behavior**:
  - From `/clients/$clientId` → `/content/create?clientId=xxx&clientName=xxx` (auto-select client)
  - From menu utama → `/content/create` (shows Select Client dropdown)
- **Back Button**: "Back" → `/clients/$clientId` | "Back to Clients" → `/clients`
- **Form Fields**:
  - Topic (text input)
  - Goal (Select Goal dropdown)
  - Platform (Select Platform dropdown - shows connected platforms first)
  - Content Type (Select Type dropdown)
  - Body (Include Hashtag) textarea
  - Start Date / End Date
- **Media Preview**: Upload image/video with preview
- **Publish Options** (professional card design with icons):
  - **Publish Now** (green card) → Cancel | Publish Post buttons
  - **Schedule For Later** (blue card) → Timezone (with UTC offsets, complete world list) + Date + Time → Cancel | Schedule Post buttons
- Facebook Page selector when platform = Facebook and connected

### 6. Content List Publishing Actions
- Per-item Publish button (Send icon)
- Per-item Schedule button (CalendarClock icon)
- Per-item Delete from Facebook (Trash icon)
- Publish/Schedule actions show page selector + datetime picker inline

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/content-store.ts` | Store: `SocialPlatform`, `SocialConnection`, `FacebookPage`, `Client`, `ContentItem` |
| `src/routes/clients.tsx` | Client list |
| `src/routes/clients.$clientId.tsx` | Client detail: Content/AI Content/Media/Settings/Account tabs (~1350 lines) |
| `src/routes/content.create.tsx` | Content creation with Publish Now/Schedule For Later |
| `src/routes/content.index.tsx` | Content list page |
| `src/components/content-list.tsx` | Content table with Publish/Schedule/Delete actions |
| `src/components/badges.tsx` | StatusBadge, PlatformBadge, ContentTypeBadge, ClientStatusBadge |
| `src/routes/api.auth.facebook.tsx` | Facebook OAuth redirect |
| `src/routes/api.auth.facebook.callback.tsx` | Facebook OAuth callback (token exchange + postMessage) |
| `src/routes/api.auth.instagram.tsx` | Instagram OAuth redirect |
| `src/routes/api.auth.instagram.callback.tsx` | Instagram OAuth callback |
| `src/routes/api.facebook.post.tsx` | Facebook Graph API: post to Page |
| `src/routes/api.facebook.photo.tsx` | Facebook Graph API: post photo |
| `src/routes/api.facebook.schedule.tsx` | Facebook Graph API: schedule post |
| `src/routes/api.facebook.edit.tsx` | Facebook Graph API: edit post |
| `src/routes/api.facebook.delete.tsx` | Facebook Graph API: delete post |
| `src/routes/settings.tsx` | Global settings page |
| `src/routes/index.tsx` | Dashboard page |

---

## 🔑 Environment Variables (`.env`)

```
META_APP_ID=1513088904188454
META_APP_SECRET=a2801fd1f190e76d0ffdb3125ec2dc14
META_REDIRECT_URI=https://socmedconnective.marketingconnective.com/api/auth/facebook/callback
```

> ⚠️ Note: `META_APP_SECRET` is hardcoded in callback files for Cloudflare Workers compatibility (not ideal for production security).

---

## 📋 Data Types

```typescript
type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "GBP" | "LinkedIn" | "Blog" | "TikTok" | "Xiaohongshu" | "Reddit" | "Threads" | "X (Twitter)";

type ContentType = "Text" | "Carousel" | "Image" | "Short Video" | "Long Video" | "Reel";
```

---

## ⏳ Pending / Next Steps

### High Priority
- [ ] Content Calendar View (see upcoming posts at a glance)
- [ ] Dashboard with analytics
- [ ] Token refresh (handle expired Facebook/Instagram tokens)
- [ ] Instagram Graph API posting (post photo/reels)
- [ ] Real-time publish to Facebook (test with production app)

### Medium Priority
- [ ] YouTube Data API integration
- [ ] Google Business Profile (GBP) posting
- [ ] LinkedIn API integration
- [ ] TikTok API integration
- [ ] Media upload (image/video) directly to Facebook/Instagram
- [ ] Bulk publish
- [ ] One post → multiple platforms

### Low Priority
- [ ] Analytics insights from published posts
- [ ] Content preview before publish
- [ ] Pricing tiers (Free / Pro / Business)
- [ ] Agency workflow improvements

### Account Tab (UI Only - Needs Backend)
- [ ] Username/Password authentication
- [ ] Google Sign-In integration
- [ ] Session management

---

## 🚀 Dev Commands

```powershell
# Start dev server
powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\paula\Social Media Connective'; npx vite dev"

# TypeScript check
npx tsc --noEmit --pretty

# Push to git (auto-deploys to Cloudflare)
git add -A; git commit -m "message"; git push origin main

# Manual deploy (if auto-deploy not configured)
# Go to Cloudflare Dashboard → Workers & Pages → Social-Media-Connective → Deployments → Retry
```

---

## 📝 Recent Changes (31 August 2026)

1. ✅ Updated Meta App ID and OAuth redirect URIs
2. ✅ Added Facebook OAuth scopes: `business_management`, `pages_read_engagement`, `pages_manage_posts`
3. ✅ Fixed Cloudflare Workers `process.env` issue (hardcoded META_APP_SECRET)
4. ✅ Removed "Manage Platforms" and "Social Integration" from clients dropdown
5. ✅ Simplified Import Posts to button-only (.docx/.pdf/.md)
6. ✅ Added AI Content tab with full form
7. ✅ Added Media tab with grid view and filters
8. ✅ Added Client Magic Link URL in Settings
9. ✅ Added professional SVG logos for all social platforms
10. ✅ Added "Coming Soon" badges for YouTube, GBP, LinkedIn, TikTok, etc.
11. ✅ Added Blog platform with WordPress logo
12. ✅ Redesigned Create Content page with Back button, Select Client, connected platforms
13. ✅ Removed Posting Settings from client Settings tab
14. ✅ Added Account tab with Username/Password and Google Sign-In (UI only)
15. ✅ Removed Published tab from client detail
16. ✅ Changed Publish Options to professional card design (Publish Now / Schedule For Later)
17. ✅ Added complete world timezone list with UTC offsets
18. ✅ Fixed clientId quotes issue in URL params
