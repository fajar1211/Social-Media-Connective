# Social Media Connective — Project Status

## Project Overview
- **Repository**: https://github.com/fajar1211/Social-Media-Connective
- **Tech Stack**: TanStack Start (React 19), TanStack Router, Nitro, Tailwind CSS v4, shadcn/ui, Vite 8
- **Dev Server**: `npx vite dev` on port 8080
- **PowerShell**: Need `-ExecutionPolicy Bypass` prefix

---

## ✅ Completed Features

### 1. Client Management (`/clients`)
- Search + filter bar
- Responsive table (desktop) + card (mobile)
- Dropdown menu: View / Edit / Manage Platforms / Social Integration / Delete
- Edit dialog: Client ID + Name + Active toggle
- Add Client dialog: Client ID + Name
- Delete with AlertDialog confirmation
- Status badge (Active/Inactive)
- Entire row clickable for navigation

### 2. Client Detail (`/clients/$clientId`)
- **Content Tab**: Status cards (Suggested/Additional/Submitted/Approved/Deleted), Import section, ContentList
- **Published Tab**: Published posts (Live badge) + Scheduled posts (Scheduled badge) with delete from Facebook
- **Settings Tab**: Social Integration cards per platform, Posting Settings section
- Social platforms: Facebook, Instagram, YouTube, Google Business Profile, LinkedIn

### 3. Social Integration OAuth (Facebook & Instagram)
- **Facebook OAuth**: `/api/auth/facebook` → redirect to Meta → `/api/auth/facebook/callback`
- **Instagram OAuth**: `/api/auth/instagram` → redirect to Meta → `/api/auth/instagram/callback`
- `auth_type=reauthenticate` → force different accounts per client
- `state` parameter = `clientId` → prevents cross-client token save
- Popup flow with `postMessage` communication
- Token stored in `SocialConnection.accessToken`, `pages` stored per-client

### 4. Facebook Content Publishing APIs
| Endpoint | Method | Function |
|----------|--------|----------|
| `/api/facebook/post` | POST | Publish text/link to Facebook Page |
| `/api/facebook/photo` | POST | Publish image to Facebook Page |
| `/api/facebook/schedule` | POST | Schedule post with datetime |
| `/api/facebook/edit` | POST | Edit existing Facebook post |
| `/api/facebook/delete` | POST | Delete Facebook post |

### 5. Content Creation with Publish (`/content/create`)
- Generate content (simulated)
- **Publish Now** button (sends to Facebook via API)
- **Schedule** button with datetime picker
- **Save Draft** / **Submit** buttons
- Select Facebook page dropdown when platform = Facebook

### 6. Content List Publishing Actions
- Per-item Publish button (Send icon)
- Per-item Schedule button (CalendarClock icon)
- Per-item Delete from Facebook (Trash icon)
- Publish/Schedule actions show page selector + datetime picker inline

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/content-store.ts` | Store: `SocialPlatform`, `SocialConnection` (with accessToken, pages), `FacebookPage`, `Client`, `ContentItem` |
| `src/routes/clients.tsx` | Client list with Social Integration overlay |
| `src/routes/clients.$clientId.tsx` | Client detail: Content/Published/Settings tabs, OAuth handler |
| `src/routes/content.create.tsx` | Content creation with Publish Now/Schedule |
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

---

## 🔑 Environment Variables (`.env`)

```
META_APP_ID=1797916071226372
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=http://localhost:8080/api/auth
```

---

## 📋 Data Types

```typescript
type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "Google Business Profile" | "LinkedIn";

type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
  category?: string;
};

type SocialConnection = {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
  accessToken?: string;
  tokenExpiresIn?: number;
  pages?: FacebookPage[];
};
```

---

## ⏳ Pending / Next Steps

### Facebook Developer Setup (BLOCKING)
1. **Add Redirect URI** in Facebook Developer Dashboard → Facebook Login → Settings:
   - `http://localhost:8080/api/auth/facebook/callback`
   - `http://localhost:8080/api/auth/instagram/callback`
2. **Activate App** (Go Live) in App Review → Switch to Live
3. **Add Permissions** in Facebook Login Settings:
   - `business_management`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
   - `instagram_basic`
   - `instagram_content_publish`
4. **Update scope** in `api.auth.facebook.tsx` and `api.auth.instagram.tsx` (add `business_management`, `pages_manage_posts`)

### Enhancements
- [ ] Token refresh (handle expired tokens)
- [ ] Instagram Graph API posting (post photo/reels)
- [ ] YouTube Data API integration
- [ ] Google Business Profile posting
- [ ] LinkedIn API integration
- [ ] Media upload (image/video) directly to Facebook/Instagram
- [ ] Analytics insights from published posts
- [ ] Bulk publish

### Known Pre-existing Issues
- `content-detail-overlay.tsx:118` — `exactOptionalPropertyTypes` error (fixed)
- `content-list.tsx:242` — `dateLabel` type error (fixed)

---

## 🚀 Dev Commands

```powershell
# Start dev server
powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\paula\Social Media Connective'; npx vite dev"

# TypeScript check
npx tsc --noEmit --pretty

# Push to git
git add -A; git commit -m "message"; git push
```
