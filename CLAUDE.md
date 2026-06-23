# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

No test suite is configured.

## Stack

- **Next.js 16.2.4** (App Router) — see AGENTS.md: read `node_modules/next/dist/docs/` before writing any Next.js code
- **React 19.2.4**, **TypeScript 5**
- **Tailwind CSS v4** — uses `@import "tailwindcss"` syntax, not v3 `@tailwind` directives
- **lucide-react** for icons
- **Supabase** — configured in [lib/supabase.ts](lib/supabase.ts) (env vars only, no client instantiated yet)

## Architecture

### Route structure

| Route | File | Notes |
|---|---|---|
| `/` | [app/page.tsx](app/page.tsx) | Public marketing landing page |
| `/login` | [app/login/page.tsx](app/login/page.tsx) | Login with company selector |
| `/logout` | [app/logout/page.tsx](app/logout/page.tsx) | Clears tokens, redirects to `/login` |
| `/dashboard` | [app/dashboard/page.tsx](app/dashboard/page.tsx) | KPI overview with charts and shipments table |
| `/dashboard/awb` | [app/dashboard/awb/page.tsx](app/dashboard/awb/page.tsx) | AWB document upload & AI extraction flow |
| `/dashboard/history` | [app/dashboard/history/page.tsx](app/dashboard/history/page.tsx) | Shipment history |
| `/dashboard/settings` | [app/dashboard/settings/page.tsx](app/dashboard/settings/page.tsx) | Settings |

### Layout hierarchy

```
app/layout.tsx          — root: Geist fonts + CompanyProvider
  app/dashboard/layout.tsx  — fixed AppHeader (50px) + Sidebar (220px) + main content
    dashboard pages     — all "use client", full-height within the main content area
```

The dashboard layout applies a `dashboard-theme-light` or `dashboard-theme-dark` class to the main content wrapper. This theme is toggled in the header and persisted to `localStorage` under `semlox-dashboard-theme`.

### Auth

Auth is **client-side only** — no middleware. Dashboard pages check `sessionStorage.getItem("semlox_access_token")` on mount and on `pageshow` (back-button navigation), redirecting to `/login` if absent. Logout clears both `localStorage` and `sessionStorage` copies.

### AWB Processing flow

Three phases managed by `phase` state in [app/dashboard/awb/page.tsx](app/dashboard/awb/page.tsx):
1. `"upload"` — drag-and-drop or file picker (PDF/JPG/PNG/TIFF, max 25 MB)
2. `"processing"` — simulated 1.8s timer, then transitions to review
3. `"review"` — split view: `AwbDocumentPreview` (left, with zoom/rotate/magnifier) + uploaded PDF iframe (right)

`AwbPaperContent` at [app/dashboard/awb/components/AwbPaperContent.tsx](app/dashboard/awb/components/AwbPaperContent.tsx) renders the AWB paper form template.

### Styling conventions

- **No tailwind.config** — Tailwind v4 infers config from usage; custom animations and keyframes are defined in `<style jsx global>` blocks inside each page/component (not in a central config).
- Dashboard theming is done entirely via CSS overrides in `<style jsx global>` blocks, **not** Tailwind dark mode variants.
- Design tokens (colors, borders, text) are declared as plain CSS classes in the dashboard's `<style jsx global>` (e.g., `.text-textx`, `.bg-surface`, `.border-borderx`) to support theme switching without component rewrites.
- Landing page loads Space Grotesk/Space Mono via inline Google Fonts; dashboard loads Inter/Space Mono the same way. The root layout loads Geist via `next/font/google` — these coexist.

### Global state

`CompanyContext` ([app/context/CompanyContext.tsx](app/context/CompanyContext.tsx)) stores the selected company ID, hydrated from `sessionStorage`/`localStorage` on mount. Wrap new server-side features around this pattern.

### Known issues / dead code

- [app/dashboard/awb/pages.tsx](app/dashboard/awb/pages.tsx) (plural) is a leftover draft file — not a valid App Router route.
- The `Sidebar` component is duplicated inline in several page files but those copies are suppressed with `void Sidebar`. The canonical sidebar is in [app/dashboard/layout.tsx](app/dashboard/layout.tsx).
- `lib/supabase.ts` exports env var values but no Supabase client is created anywhere yet.
