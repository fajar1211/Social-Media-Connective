<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Social Media Connective — Development Notes

## Project Context
- Multi-tenant social media content management SaaS
- Admin/client roles with different Facebook OAuth configurations
- Supabase backend, Cloudflare Workers deployment
- Production: https://socmed.marketingconnective.com/

## Current State (September 2026)
- **Facebook App ID**: `1109449551768527` (new app)
- **Facebook App Secret**: `42bc8519cc029ed1e79062a137d57b75`
- **Status**: App created, waiting for App Review submission
- **Blocker**: Pages permissions not yet approved by Facebook

## Key Architecture Decisions
1. **1 client = 1 manager model** (NOT multi-client per user)
2. **Role-based OAuth**: Admin uses config_id, Client uses standard OAuth
3. **Client ID format**: Sequential `S0100`, `S0101`, etc.
4. **Content filtering**: Dual fallback (`clientId` or `client.name`)
5. **Magic link**: Public client portal at `/client/$token`

## Facebook Login for Business
- Admin config_id: `1015151248177076` (Connective User)
- Client: No config_id (standard OAuth)
- This allows clients to see their own pages, not admin's pages

## Important Commands
```powershell
# Dev server
powershell -ExecutionPolicy Bypass -Command "cd 'C:\Users\paula\Social Media Connective'; npx vite dev"

# TypeScript check
npx tsc --noEmit --pretty

# Deploy
git add -A; git commit -m "message"; git push origin main
```

## Common Issues
1. **"Fitur Tidak Tersedia"**: App Review not submitted/approved
2. **Client sees admin's pages**: Wrong config_id used
3. **Token not saving**: Check postMessage + localStorage flow
4. **Content not showing**: Check clientId filter

## File Locations
- OAuth files: `src/routes/api.auth.*.tsx`
- Client detail: `src/routes/clients.$clientId.tsx`
- Content store: `src/lib/content-store.ts`
- Supabase queries: `src/lib/db.ts`
