# SemloX Auth and Backend Context

## 1. Project Overview

SemloX is a Next.js App Router + TypeScript + Supabase SaaS application for AI logistics workflows, including company accounts, team members, AWB processing, documents, and extraction workflows.

The app uses:

* Next.js App Router
* TypeScript
* Supabase Auth
* Supabase Postgres
* Brevo SMTP configured inside Supabase Auth
* Cookie-based auth using an httpOnly cookie named `semlox_session`

This document exists so future developers and AI coding agents can continue safely without breaking the working auth/backend flow.

---

## 2. Core Database Model

Main database tables:

### `auth.users`

Supabase-managed authentication users.

Stores:

* authenticated user id
* email
* email confirmation state
* login metadata

Do not store or read plaintext passwords. Passwords are handled only by Supabase Auth.

### `public.profiles`

Application profile data for users.

Typical fields:

* id linked to `auth.users.id`
* full_name
* phone
* job_title
* timezone
* avatar_url
* is_active

### `public.companies`

Organization/company records.

Typical fields:

* id
* name
* contact_email
* phone
* timezone
* quotas/settings
* metadata

### `public.memberships`

Relationship table connecting users to companies.

Important fields:

* company_id
* user_id
* role
* invited_by
* invited_at
* accepted_at
* created_at
* updated_at

This table is the source of truth for company access.

A user should not access a company unless a valid membership exists.

---

## 3. Roles and Access Rules

Supported roles include:

* `owner`
* `admin`
* `manager`
* `operator`
* `viewer`

Current product rule:

* Owners/admins can manage team members.
* Operators/viewers should not access Team Members settings.
* Company login is only for owners/admins.
* Employee/User login requires selecting a company and then validating membership server-side.

Important membership rules:

* Company owner signup creates membership with:

  * `role = owner`
  * `accepted_at = now()`

* Invited employees are created with:

  * `accepted_at = null`
  * `invited_at = now()`
  * `invited_by = current owner/admin user id`

* Invite acceptance must update only the specific membership row:

  * current authenticated user id
  * target company id
  * `accepted_at IS NULL`

Never auto-accept all pending memberships.

---

## 4. Session and Authentication Architecture

The project moved away from relying primarily on:

```ts
sessionStorage.getItem("semlox_access_token")
```

The primary session source is now an httpOnly cookie:

```text
semlox_session
```

This cookie is set by server routes after successful login or auth callback exchange.

Important:

* Client JS cannot read httpOnly cookies.
* Logged-in client requests should use:

```ts
credentials: "include"
```

* Protected API routes should authenticate from:

  1. `Authorization: Bearer <token>` if present
  2. `semlox_session` cookie fallback

Most protected routes should use the existing helper:

```ts
extractBearerTokenFromRequest(request)
```

This helper should support both Bearer token and cookie-based auth.

Never send:

```ts
Authorization: Bearer null
```

If no client token exists, rely on the cookie.

---

## 5. Middleware Protection

Middleware protects dashboard/private routes before rendering.

Protected routes include:

* `/dashboard`
* `/dashboard/*`
* settings pages
* AWB pages
* documents/private pages

Purpose:

* prevent dashboard flash for logged-out users
* redirect unauthenticated users to `/login` before protected UI renders
* allow logged-in users with valid session cookie to continue

Important:

* Do not reintroduce client-only dashboard protection that first renders the dashboard and then redirects.
* Do not rely on `sessionStorage` as the main dashboard gate.
* Middleware/session cookie should remain the primary protection.

---

## 6. Auth Routes

### `/api/auth/login`

Purpose:

* authenticate email/password with Supabase Auth
* create/set `semlox_session` httpOnly cookie
* return structured response

Expected success response:

```json
{ "ok": true }
```

Expected error shape:

```json
{ "ok": false, "code": "ERROR_CODE", "message": "User friendly message" }
```

Important:

* Do not log password.
* Do not log tokens.
* Do not log full session.
* Do not return vague `{ "message": "Login failed" }`.

### `/api/auth/exchange`

Purpose:

* handles Supabase auth callback/code exchange
* sets `semlox_session`
* supports PKCE/callback flow

Important:

* do not leave access tokens visible in URL
* do not log auth code/session/tokens
* cookie auth should remain primary

### `/api/auth/signout`

Purpose:

* clears `semlox_session`
* clears old/fallback client storage if used by logout page
* redirects user to login

### `/api/auth/memberships`

Purpose:

* returns memberships for the current authenticated user
* authenticates by Bearer token or cookie
* should return only safe fields such as:

  * company_id
  * role
  * accepted_at

### `/api/auth/resolve-company-login`

Purpose:

* used by Company Sign In tab
* after email/password login, resolves which company this user can access as company owner/admin
* does not require selected company in the UI

Rules:

* allow only `owner` or `admin`
* employees should use User Sign In instead
* return structured error if no owner/admin company is found

### `/api/auth/validate-company`

Purpose:

* used by User/Employee Sign In
* validates selected company server-side
* authenticates with cookie or Bearer token

Rules:

* do not trust frontend companyId blindly
* verify membership exists
* for employee roles, require `accepted_at`
* return clear error if invite not accepted

### `/api/auth/accept-invite`

Purpose:

* accepts a pending employee invitation

Rules:

* authenticate current user
* require companyId
* validate companyId is valid
* update only this membership:

```text
memberships.user_id = authenticated user id
memberships.company_id = requested companyId
memberships.accepted_at IS NULL
```

Do not update all pending memberships.

---

## 7. Company Signup Flow

Company signup flow:

1. User enters full name, company name, email, password.
2. App uses Supabase signup flow so email confirmation works.
3. Supabase sends confirmation email through Brevo SMTP.
4. User confirms email via auth callback.
5. App creates:

   * auth user
   * profile
   * company
   * owner membership

Owner membership should be:

```text
role = owner
accepted_at = now()
```

Important:

* Do not force `email_confirm: true` for normal signup if email confirmation is required.
* Do not bypass Supabase email verification.
* Do not use Brevo API directly.

---

## 8. Company Login Flow

Company login is for owners/admins only.

Flow:

1. User chooses Company tab.
2. Enters email/password.
3. Frontend calls `/api/auth/login`.
4. Server authenticates with Supabase and sets `semlox_session`.
5. Frontend calls `/api/auth/resolve-company-login`.
6. If owner/admin membership exists, selected company is set.
7. Redirect to dashboard.

Company login should not require selecting a company manually.

---

## 9. Employee/User Login Flow

User login is for employees/team members.

Flow:

1. User chooses User tab.
2. User selects company from company dropdown.
3. Company dropdown should load real companies from `/api/public/companies`.
4. User enters email/password.
5. Frontend calls `/api/auth/login`.
6. Frontend calls `/api/auth/validate-company`.
7. Backend validates selected company membership.
8. If membership is valid and accepted, redirect to dashboard.

Rules:

* selected dropdown value must be company id, not company name
* backend is final authority
* employees with `accepted_at = null` should be rejected with a clear invite-not-accepted message

---

## 10. Invite / Add Member Flow

Owners/admins can invite employees from Settings -> Team Members.

Flow:

1. Owner/admin opens Add Member modal.
2. Enters full name, email, role.
3. Frontend calls `/api/invite` with `credentials: "include"`.
4. Backend authenticates from `semlox_session` cookie or Bearer token.
5. Backend verifies caller is owner/admin.
6. Backend sends invite using Supabase Admin JS:

```ts
supabase.auth.admin.inviteUserByEmail(...)
```

7. Supabase sends email using Brevo SMTP configured inside Supabase.
8. Backend creates/updates profile/membership.
9. Membership has:

   * selected role
   * invited_by
   * invited_at = now()
   * accepted_at = null

Important:

* Do not use Brevo API directly.
* Do not call guessed Supabase admin endpoints manually.
* Do not expose service role key to client.
* Do not allow operator/viewer to invite users.
* Do not auto-accept invited employees.

---

## 11. Team Members UI

Team Members page should use real database data only.

Rules:

* no dummy/static users
* owner/admin only
* `/api/company/members` should return current company members only
* backend must verify the requester is owner/admin
* table should show real:

  * user email
  * full name
  * role
  * status
  * invited/accepted state

Status mapping:

* `accepted_at = null` and `invited_at != null` -> invited
* active accepted membership -> active
* disabled profile if supported -> disabled

After Add Member succeeds:

* show success toast/message
* refresh members table
* modal should not silently close without feedback
* on failure, keep modal open and show backend message

---

## 12. User Settings UI

Employee roles (`manager`, `operator`, `viewer`) see a personal User Settings view at `/dashboard/settings` instead of company administration settings.

Rules:

* user settings are personal/user-safe only
* profile updates must authenticate from `semlox_session` cookie or Bearer token
* profile updates must be self-only and must not accept or trust a frontend `userId`
* user settings must not expose Team Members, billing, integrations, API keys, company profile editing, or role management
* avatar uploads use Supabase Storage bucket `avatars`
* if the `avatars` bucket is missing, the API should return `Avatar storage is not configured.`

Current User Settings APIs:

* `GET /api/user/profile`
* `PATCH /api/user/profile`
* `POST /api/user/avatar`
* `POST /api/user/password-reset`

These routes must not update `auth.users.email`, `memberships.role`, company rows, billing, integrations, or team member data.

---

## 13. Notification Center

The shared dashboard header includes a database-backed notification bell and dropdown.

Notification rules:

* notification APIs authenticate through Bearer token or the `semlox_session` cookie
* `user` audience notifications are visible only to the matching authenticated user
* `company_members` notifications require membership in the notification company
* `company_admins` notifications require an `owner` or `admin` membership
* archived, expired, and preference-hidden notifications are excluded from the default list and unread count
* critical and security notifications remain visible even when normal in-app notifications are disabled
* notification `data` must never contain secrets, tokens, private metadata, or arbitrary external links
* only safe internal links beginning with `/dashboard` may be returned to the notification UI
* direct `user` notifications keep using the legacy row-level `is_read`, `read_at`, and `archived_at` fields
* shared `company_members` and `company_admins` notifications use `notification_receipts` for per-user read and archive state
* shared receipts are created lazily when the current user reads, archives, or marks notifications read

Current notification APIs:

* `GET /api/notifications`
* `PATCH /api/notifications`
* `POST /api/notifications/mark-all-read`
* `POST /api/notifications/archive`
* `POST /api/notifications/announcement`

Owners and admins can send a workspace announcement from Settings > Team Members. The server verifies the authenticated user's accepted owner/admin membership and creates one `company_members` notification row. It does not create one notification per member, and one member's receipt never changes another member's unread or archived state.

Notifications are created only by server-side backend events through the validated `createNotification` helper. Current event hooks include:

* member invited or re-added
* invite accepted
* member role changed
* member removed
* invite resent
* password reset requested
* personal profile updated
* profile picture updated

Notification creation is best-effort and must never turn an otherwise successful primary action into a failure. Frontend code must never insert notification rows directly.

---

## 14. Dashboard Account Menu

The shared dashboard header includes a reusable user account menu backed by real authenticated profile data.

Rules:

* profile, email, avatar, selected workspace, and role load from cookie-authenticated APIs
* logged-in client requests use `credentials: "include"`
* the avatar uses the profile image when available, then real name/email initials, then a user icon
* owner/admin shortcuts are hidden for manager/operator/viewer users
* role-based menu visibility is UX only; backend authorization remains authoritative
* settings shortcuts use `/dashboard/settings?section=...` and invalid or unauthorized sections fall back safely
* signout must call `POST /api/auth/signout` so the server clears `semlox_session`
* signout must not rely only on clearing browser storage

---

## 15. AWB Extraction Flow

The AWB Processing extraction path supports:

```text
upload -> server-side mock/live/fallback extraction -> normalized fields -> review
```

Configuration:

```env
AWB_EXTRACTION_MODE=mock
AWB_EXTRACTION_API_URL=
AWB_EXTRACTION_TIMEOUT_MS=180000
AWB_EXTRACTION_API_KEY=
```

Live AWB extraction is proxied server-side through `POST /api/awb/extract`; the
browser never calls the Flask provider directly. Configure deployment
environment variables with `AWB_EXTRACTION_MODE=live`,
`AWB_EXTRACTION_API_URL`, and optionally `AWB_EXTRACTION_TIMEOUT_MS` (default
180000) and `AWB_EXTRACTION_API_KEY`. Use `fallback` to try live extraction
first and clearly return mock data with `mode = "fallback"` when the provider
is unavailable. Provider URLs and keys must never use a `NEXT_PUBLIC_` prefix.

Supported mode names are `mock`, `live`, and `fallback`. Current behavior:

* `mock` uses the local fixture and never calls a live AI provider
* `live` calls the configured Flask provider server-side and fails with a safe structured error when unavailable
* `fallback` tries the live provider first, then returns the local fixture with `mode = "fallback"` and an explicit fallback message

The frontend sends the selected PDF/image to `POST /api/awb/extract` with `credentials: "include"`. The route authenticates through the existing cookie/Bearer helper, validates PDF/JPG/PNG/TIFF files up to 25 MB, and returns the stable SemLoX AWB extraction schema.

Raw provider responses must pass through `normalizeAwbExtractionResponse()` before reaching the Review Fields UI. The normalizer maps entity names, resolves duplicate fields by highest confidence, calculates status/colors and summary totals, and preserves safe run/timing metadata.

AWB extraction now persists to the focused `awb_documents` and `awb_fields` tables. Existing `documents`, `extraction_results`, `awbs`, and `awb_history` tables remain unchanged.

Persistence rules:

* extraction creates one company-scoped `awb_documents` row and one `awb_fields` row per normalized field
* original source files are stored in the private Supabase Storage bucket `awb-source-documents` during extraction and the path is saved in `awb_documents.storage_path`
* the selected browser file is still used for immediate local preview after upload; persisted documents use a server-generated signed URL
* the Review UI retains the real database document ID returned by extraction
* edited values save through `PATCH /api/awb/documents/[documentId]/fields`
* Save Draft posts current values to `POST /api/awb/documents/[documentId]/draft`
* saved documents reload through `GET /api/awb/documents/[documentId]`
* every document route authenticates with the cookie/Bearer helper and verifies accepted membership in the document company
* service-role database access remains server-only
* the top action bar and paper preview use the same Save Draft handler; saving persists the latest normalized field values, sets the document status to `draft`, and does not download a PDF
* `POST /api/awb/documents/[documentId]/issue` authenticates through the existing cookie/Bearer helper, verifies company membership and an allowed role, saves the latest fields, validates required fields server-side, and sets the status to `issued`
* Issue AWB and Export Final PDF use the same client handler; the existing final PDF generator is called only after the issue route succeeds
* AI review and confidence colors are advisory; issuing is blocked only when a supported required field exists but its value is empty
* Issue AWB first asks the user to confirm that all extracted fields were reviewed; confirmation does not add a database approval state
* mapped paper fields stay synchronized with the normalized Review Fields state
* paper controls without a value mapping in the current normalized extraction payload remain visible but are disabled, greyed, and excluded from draft/issue validation
* `goods_dimensions_or_volume` is supported by the normalized review data and final PDF payload, but the current paper template has no dedicated matching form control; it remains editable in Review Fields
* the larger left review workspace uses a UI-only `AWB Form` / `Extracted Fields` segmented control, defaults to the AWB form, and keeps both views mounted so switching does not lose edits or local view state
* the original Source Document remains independently visible in the right column during either left-side view; below 1280px the review workspace stacks above the source viewer
* Review Fields filters are client-only (`All`, `Needs Review`, `Warnings`, `Valid`, `Manually Reviewed`, and `Missing`) and do not change persisted field state
* `Manually Reviewed` is tracked only after a user edits a field during the current review session; initial AI comments do not mark fields as manually reviewed

Activity History is database-backed through `GET /api/awb/history`:

* `scope=my` returns only documents uploaded by the authenticated user
* `scope=company` is accepted only for owner/admin and returns all documents in the selected accepted company
* company, user, and role visibility are enforced server-side; frontend tabs are UX only
* stats, AWB number, status/action, field counts, processed-by identity, timestamps, and file metadata come from `awb_documents`, `awb_fields`, profiles, and server-side auth user data
* the History detail panel fetches `GET /api/awb/documents/[documentId]` and renders the real normalized fields
* owner/admin can open any document in their accepted company; manager/operator/viewer can open only documents they uploaded
* `Open in AWB Processing` navigates to `/dashboard/awb?documentId=<id>` and loads persisted fields without rerunning extraction
* reopened issued documents are read-only; editable saved documents retain Save Draft and Issue actions
* when `storage_path` is null, reopened documents show `Source file is not stored yet.` instead of attempting to display the original file
* when `storage_path` exists, `GET /api/awb/documents/[documentId]` returns a short-lived signed `history.sourceUrl` for the private source file
* issued AWBs clear `storage_path` and best-effort delete the source file because issued documents no longer need to retain the original upload
* History CSV exports only the currently filtered API rows and never uses sample data
* the database wiring preserves the original History UX: pill actions, four gradient-topped metrics, dense date/status/action filters, selectable sortable table with pagination, progress bars, status badges, and the sliding right-side detail drawer
* History styling follows the shared dashboard light/dark theme and does not replace the dashboard header, sidebar, account menu, or notification controls

AWB production analytics use two append-only tracking tables:

* `awb_field_revisions` stores each actual value change with old/new values, AI original value, AI confidence/status, authenticated editor, company/document, and change source
* `awb_events` stores safe AWB activity events such as extraction completion/failure, field updates, draft saves, and issuance
* client code has no insert/update/delete policies for these tables; membership-validated server routes write with the service role
* tracking writes are best-effort after the primary AWB operation so analytics availability does not corrupt a successful field/document update
* AI confidence is displayed separately from human correction rate; confidence is not treated as measured accuracy

The main dashboard is database-backed:

* `GET /api/dashboard/user` returns only the authenticated user's AWB data in the selected accepted company
* `GET /api/dashboard/company` is owner/admin-only and returns company-wide AWB data
* both routes support `range=7d|30d|90d` and derive user, company, and role server-side
* dashboard KPIs, Recharts trend/status/team charts, pending work, activity, team totals, active documents, and exceptions use `awb_documents`, `awb_fields`, `awb_events`, memberships, profiles, and safe user display data
* owner/admin users can switch between My Overview and Company Overview; other roles never receive the company toggle
* no shipment tracking, carrier performance, ETA, route, modal split, or other unsupported logistics metrics are shown

---

## 16. Public Companies Dropdown

User Sign In company dropdown should load real companies from:

```text
/api/public/companies
```

This endpoint should return only:

```json
[
  { "id": "company uuid", "name": "Company Name" }
]
```

Do not expose:

* contact_email
* tax_id
* metadata
* quotas
* addresses
* private settings

Do not show dummy companies like:

* DHL
* Maersk
* Hapag-Lloyd
* static logistics companies

Dropdown UI should:

* be custom styled
* match SemLoX dark auth card
* use compact option rows
* use max-height scroll
* not over-expand the login card
* close on selection and outside click
* be readable in dark and light mode

---

## 17. Structured API Response Standard

All new/updated API routes should use:

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "User friendly message"
}
```

Do not return raw technical errors to the frontend.

Frontend should show `message` to the user where appropriate.

---

## 18. Security Rules

Never expose or log:

* passwords
* access tokens
* refresh tokens
* cookies
* full sessions
* service role keys
* full request headers
* full Authorization headers

Other rules:

* service role key is server-only
* do not disable RLS
* do not change schema without asking
* do not trust companyId from frontend
* always validate company access server-side
* do not update memberships directly from frontend
* do not update all pending invite rows
* do not reintroduce sessionStorage-only auth
* do not reintroduce dummy data

---

## 19. Current Working Status

Currently working or mostly completed:

* Brevo SMTP through Supabase works.
* Company signup/email confirmation works.
* Company login works.
* Cookie-based `semlox_session` auth is primary.
* Dashboard flash issue was addressed with middleware.
* Auth routes support cookie/Bearer fallback.
* Add Member authorization issue was fixed.
* Invite route was moved to Supabase Admin JS.
* Settings/Team Members are being moved to DB-backed data.
* Public company dropdown is being moved to DB-backed data.

Current pending/refinement tasks:

* polish User Sign In company dropdown UI
* ensure no dummy users/companies remain
* verify Add Member success toast and team table refresh
* fix TypeScript errors in core auth routes if present
* keep documentation updated as implementation changes

---

## 20. How Future AI Agents Should Work

Before editing:

1. Inspect relevant files.
2. Report what you found.
3. Make minimal focused changes.
4. Do not rewrite working auth/session/login/dashboard code.
5. Preserve cookie-based auth compatibility.
6. Use `credentials: "include"` for logged-in client requests.
7. Use shared auth helper for protected API routes.
8. Do not reintroduce dummy data.
9. Do not add Redux unless explicitly requested.
10. Prefer simple hooks/context or SWR/React Query only if needed.
11. Do not change database schema/RLS without asking.

This document should be read before making backend/auth/team/company-login related changes.

---

## 21. Frontend Architecture and UI Control Flow

The app uses the Next.js App Router. Dashboard screens are mostly client components under `app/dashboard/*` because they depend on authenticated client-side state, company context, UI tabs, local form edits, file uploads, PDF canvas rendering, and optimistic review state.

Important UI entry points:

* `app/page.tsx` - public landing page
* `app/login/page.tsx` - company/user sign-in UI
* `app/dashboard/layout.tsx` - authenticated dashboard shell, sidebar, header, account menu, theme controls, notification bell
* `app/dashboard/page.tsx` - dashboard overview metrics/charts/pending work
* `app/dashboard/awb/page.tsx` - AWB upload, extraction, review, draft, issue flow
* `app/dashboard/awb/components/AwbPaperContent.tsx` - visual AWB paper/form renderer and editable paper fields
* `app/dashboard/history/page.tsx` - AWB history table and detail drawer
* `app/dashboard/settings/page.tsx` - owner/admin company settings
* `app/dashboard/settings/components/UserSettingsView.tsx` - employee/user personal settings
* `app/dashboard/components/UserAccountMenu.tsx` - profile/account dropdown
* `app/dashboard/components/notifications/*` - notification bell, dropdown, and hook
* `app/context/CompanyContext.tsx` - selected company/membership context
* `app/utils/authClient.ts` - frontend auth/membership helper

The UI is controlled by a combination of:

* cookie-authenticated API calls using `credentials: "include"`
* `CompanyContext` for selected workspace/company
* local React state for current form edits, view modes, loading states, and modals
* URL search params for some persisted navigation state such as `documentId`
* Supabase-backed API routes for all authoritative data

Client state should never be treated as authorization. It is only for UX. Every server route must re-authenticate and verify company/membership access.

---

## 22. Dashboard Shell, Sidebar, Header, and Theme

The dashboard shell provides:

* persistent left sidebar navigation
* dark fixed header
* light/dark theme controls
* filter and notification icons
* user account menu
* company/user context display
* optional collapsed sidebar behavior for more AWB workspace room

The sidebar and header are intentionally dark across themes. Content surfaces switch between light and dark mode. Future UI optimization should keep this split:

* shell/header/sidebar: dark brand surface
* page content: theme-aware light/dark surfaces
* buttons: blue primary buttons always use white text
* settings inner navigation: theme-aware active states, not hardcoded dark backgrounds in light mode

Theme implementation is mostly Tailwind class based, with some global dashboard/AWB CSS in `app/globals.css`. Watch for hardcoded dark colors such as `bg-[#070b17]`, `text-white`, or `border-white/10` inside light-mode content. These need matching `dark:` variants or light-mode defaults.

---

## 23. Company Context and Workspace Selection

`CompanyContext.tsx` manages the selected company and memberships. It loads memberships from:

```text
GET /api/auth/memberships
```

Important behavior:

* requests use `credentials: "include"`
* selected company id should be stable
* setters should remain memoized/stable to avoid dashboard render loops
* if no selected company exists and memberships exist, choose a safe default accepted membership
* dashboard pages should wait for company context before fetching company-scoped APIs
* login should validate selected company before redirecting to dashboard

Frontend company id is a request parameter only. Backend routes must still verify membership.

---

## 24. Login UI Functional Flow

`app/login/page.tsx` contains two modes:

* Company Sign In - owner/admin company login
* User Sign In - employee login with selected company

User Sign In:

1. loads public companies from `GET /api/public/companies`
2. user selects company id from dropdown
3. user enters email/password
4. posts `POST /api/auth/login`
5. posts `POST /api/auth/validate-company`
6. sets selected company context
7. redirects to `/dashboard`

Company Sign In:

1. user enters email/password
2. posts `POST /api/auth/login`
3. posts `POST /api/auth/resolve-company-login`
4. selects the owner/admin company
5. redirects to `/dashboard`

Rules:

* login payload must use `{ email, password }`
* do not send `username` to `/api/auth/login`
* use cookie auth after login, not `sessionStorage`
* company dropdown value must be company id
* dropdown UI closes on selection and outside click

---

## 25. AWB Processing UI State Machine

`app/dashboard/awb/page.tsx` controls the AWB workflow with phases:

```text
upload -> processing -> review
```

Core local state includes:

* selected file
* local preview URL for newly uploaded file
* extraction response
* extraction/loading errors
* loaded persisted document state
* document edit permission
* source stored state
* current review view (`AWB Form` or `Extracted Fields`)
* saving/issuing/loading states
* manual review markers
* issue confirmation modal state

Upload flow:

1. user chooses or drops PDF/image
2. frontend validates type and size
3. local object URL is created for immediate preview
4. `POST /api/awb/extract` is called with `FormData`
5. request includes selected `companyId` and `credentials: "include"`
6. UI shows processing state while server extracts and persists
7. successful response becomes the source of truth for review

Processing state:

* shows stepper and progress card
* must be theme-aware in light/dark mode
* does not expose backend internals
* failures show retry/choose another actions without changing extraction logic

Review state:

* left side contains AWB Form / Extracted Fields toggle
* right side contains Source Document viewer
* summary chips are derived from the same normalized field state
* paper form and extracted fields share the same `extraction.fields` state
* source document remains visible independently of left-side toggle

---

## 26. AWB Extraction API and Persistence Flow

`POST /api/awb/extract` is the only browser-facing extraction endpoint.

Server behavior:

1. authenticate request from cookie/Bearer token
2. parse `FormData`
3. validate file type and size
4. validate selected company membership
5. create AWB event `extraction_started`
6. run mock/live/fallback extraction
7. normalize provider response
8. create `awb_documents` row
9. upload original source file to private Supabase Storage bucket `awb-source-documents`
10. update `awb_documents.storage_path`
11. create `awb_fields` rows
12. create AWB event `extraction_completed`
13. return normalized extraction response

Failure behavior:

* provider failures create a failed document where possible
* failed source files are also stored when the failed document is created
* notification/event writes are best-effort
* no passwords/tokens/cookies/full files are logged

Storage details:

* bucket: `awb-source-documents`
* bucket should be private
* service role uploads/deletes/signs files server-side
* path shape is company/document/file-name based
* client never receives service role key
* `GET /api/awb/documents/[documentId]` returns signed source URL only after membership authorization
* issued documents delete source file and clear `storage_path`

---

## 27. AWB Review Field State and Mapping

The normalized extraction field structure is the UI/backend contract:

```ts
{
  key: string;
  label: string;
  value: string;
  confidence: number;
  confidencePercent: number;
  needsReview: boolean;
  status: "valid" | "warning" | "missing";
  color: "blue" | "green" | "yellow" | "red";
  comment?: string;
  page?: number;
  source?: string;
}
```

Field stats must be derived from `extraction.fields`, not separate hardcoded UI counters.

Important mappings:

* `awb_number` is the AWB number
* `reference_number` is separate from AWB number
* provider date currently maps to `executed_on_date`, not requested flight date
* `pieces` maps to number of pieces and pieces line where needed
* `gross_weight` maps to gross weight and weight line where needed
* `chargeable_weight`, `weight_unit`, and goods details drive AWB form fields

Manual accept/tick behavior:

* review/warning/missing fields can be accepted as correct
* the tick button does not require changing text
* accepted field becomes valid/manually reviewed in local review state
* draft/issue actions persist current field values/status through server routes

Optimization note:

* keep one field state object as the source of truth
* avoid separate counters for form, extracted fields, and summary chips
* keep all paper-field mappings centralized to avoid reference/AWB/date mistakes

---

## 28. AWB Paper Form UI

`AwbPaperContent.tsx` renders the visual AWB paper form. It is intentionally different from a simple input table because it mimics the paper AWB layout.

Responsibilities:

* render AWB cells and section borders
* show confidence badges
* show missing/review coloring
* allow editing mapped fields
* allow manual accept/tick of review fields
* call parent handlers for value changes and acceptance
* provide Save Draft and Issue/Export buttons in paper context

Important layout rules learned during fixes:

* avoid mixing percentage row heights and `minmax(auto)` rows carelessly
* input areas should stay inside their parent cell
* disabled/placeholder cells need stable height and padding
* avoid double borders by deciding whether parent grid or child cell owns borders
* confidence badges and accept buttons must not push text outside cells
* accept/tick buttons should sit in the lower-right of the cell and not disturb text

Known optimization area:

* consolidate AWB paper cell variants into stable data-cell and placeholder-cell modes
* centralize border ownership to reduce missing/double border bugs
* reduce legacy/commented code inside `AwbPaperContent.tsx`

---

## 29. Source Document PDF Viewer

The Source Document viewer is controlled in `app/dashboard/awb/page.tsx` inside `UploadedPdfPanel`.

Current behavior:

* newly uploaded files use a browser `blob:` object URL for immediate preview
* persisted draft/review files use signed Supabase Storage URLs
* PDF rendering uses PDF.js canvas controlled by the app
* source magnifier is enabled by default
* magnifier reads pixels from the controlled canvas, not a native PDF iframe
* page count/page number and zoom state are local UI state

Why PDF.js canvas is used:

* native iframe/browser PDF viewers cannot expose reliable internal page coordinates
* magnifier needs controlled DOM/canvas pixels to zoom accurately

Important implementation details:

* object URLs should only be revoked when they start with `blob:`
* signed HTTPS URLs must not be passed to `URL.revokeObjectURL`
* canvas render quality is device-pixel-ratio aware
* magnifier canvas is mounted when magnifier is enabled and hidden via opacity until pointer coordinates exist
* lens should attach to actual canvas/page area, not the full card/header

Optimization note:

* PDF.js rendering can be heavy; avoid rendering all pages at once
* only current page should render unless a virtualized multi-page viewer is intentionally added

---

## 30. Save Draft, Reopen, and Issue AWB

Save Draft:

```text
POST /api/awb/documents/[documentId]/draft
```

Frontend sends current field values:

```json
{
  "fields": [
    { "key": "awb_number", "value": "..." }
  ]
}
```

Backend:

* authenticates user
* verifies document/company access
* updates changed fields
* sets document status to `draft`
* creates event `draft_saved`

Reopen persisted document:

```text
GET /api/awb/documents/[documentId]
```

Backend:

* authenticates user
* verifies company access and upload/admin permission
* loads document and fields
* returns normalized extraction response
* returns `history.canEdit`
* returns `history.storagePath`
* returns signed `history.sourceUrl` if source exists and document is not issued

Issue AWB:

```text
POST /api/awb/documents/[documentId]/issue
```

Backend:

* authenticates user
* verifies allowed role
* saves latest fields
* validates required fields
* sets document status to `issued`
* clears `storage_path`
* best-effort deletes source file from storage
* creates event `issued`

Frontend:

* asks for confirmation
* calls issue route
* only after success generates/downloads final PDF
* updates UI to issued/read-only state

---

## 31. Final AWB PDF Generation

The current client downloads issued PDFs through the first-party document route:

```text
/api/awb/documents/[documentId]/pdf
```

The route verifies document access, requires `status = "issued"`, loads stored
fields server-side, maps them to the PDF service payload, and streams the PDF
back to the browser. The browser no longer posts AWB field payloads directly to
the external PDF generation service.

Important:

* this is separate from the extraction provider
* this should not be called before the server-side issue route succeeds
* frontend calls must use `credentials: "include"`
* do not change this without confirming because it affects final document export behavior

---

## 32. History Page UI and API Flow

`app/dashboard/history/page.tsx` loads dynamic history from:

```text
GET /api/awb/history
```

Query params include:

* selected company id
* scope (`my` or `company`)
* status/date/search filters where supported

UI behavior:

* table is paginated
* filters are local UI controls backed by API data
* date picker uses custom SemLoX calendar UI
* detail drawer loads selected document through `GET /api/awb/documents/[documentId]`
* `Open` navigates to `/dashboard/awb?documentId=<id>`

Authorization:

* owner/admin can view company scope
* other roles can view their own documents only
* backend enforces this regardless of UI tabs

Optimization areas:

* avoid duplicate `GET /api/auth/memberships` calls from multiple mounted components
* consider shared request caching for history/detail fetches
* keep history table server-backed, not dummy/static

---

## 33. Dashboard Overview UI and API Flow

`app/dashboard/page.tsx` loads metrics from:

```text
GET /api/dashboard/user?companyId=...&range=...
GET /api/dashboard/company?companyId=...&range=...
```

The selected scope determines endpoint:

* `user` scope for current user's documents
* `company` scope for owner/admin company overview

UI includes:

* KPI cards
* trend/status/team charts
* AI quality signal blocks
* completion vs pending work blocks
* pending work table
* active documents
* recent activity/exceptions

Important:

* scope toggle is UX only; backend validates owner/admin before company metrics
* dashboard fetch should wait for selected company id
* dashboard should not refetch in an infinite loop
* `setSelectedCompanyId` should not be called repeatedly with same value

Optimization areas:

* centralize dashboard fetch/loading state
* avoid duplicate membership initialization
* normalize pending work and history status calculations from the same backend data model

---

## 34. Settings UI and API Flow

`app/dashboard/settings/page.tsx` chooses between:

* company administration settings for owner/admin
* user settings for manager/operator/viewer

Company settings include:

* company profile
* team members
* API & webhooks
* integrations
* notifications
* security
* billing & plan

User settings include:

* profile
* account/security
* notifications
* preferences
* workspace info

Team Members flow:

* load members with `GET /api/company/members?companyId=...`
* add member with `POST /api/invite`
* update role/resend/remove through `/api/company/members`
* all requests use `credentials: "include"`
* owner/admin access verified server-side
* manual refresh button reloads latest accepted/invited status

User Settings APIs:

* `GET /api/user/profile`
* `PATCH /api/user/profile`
* `POST /api/user/avatar`
* `POST /api/user/password-reset`
* `GET/PATCH /api/user/notifications`

Optimization areas:

* keep settings tab switching local and avoid full dashboard shell remount
* avoid re-fetching profile/memberships more than necessary
* keep company settings and user settings style consistent in light/dark mode

---

## 35. Notifications UI and API Flow

Notification UI is in the dashboard header and uses:

```text
app/dashboard/components/notifications/useNotifications.ts
```

Client calls:

* `GET /api/notifications`
* `PATCH /api/notifications`
* `POST /api/notifications/mark-all-read`
* `POST /api/notifications/archive`

All requests use cookie auth with `credentials: "include"`.

Behavior:

* dropdown shows visible notifications and unread count
* direct notifications use row-level read/archive fields
* shared notifications use `notification_receipts` per user
* mark-all-read only marks current user's visible notifications
* archive only archives for current user
* workspace announcement modal creates one shared company notification

Optimization areas:

* avoid polling too frequently
* debounce/serialize read/archive actions if needed
* keep notification creation server-side and best-effort

---

## 36. API Calling Patterns

Frontend protected requests must include:

```ts
credentials: "include"
```

Common client calls:

* `GET /api/auth/memberships`
* `POST /api/auth/login`
* `POST /api/auth/validate-company`
* `POST /api/auth/resolve-company-login`
* `POST /api/auth/signout`
* `GET /api/public/companies`
* `GET /api/dashboard/user`
* `GET /api/dashboard/company`
* `POST /api/awb/extract`
* `GET /api/awb/history`
* `GET /api/awb/documents/[documentId]`
* `POST /api/awb/documents/[documentId]/draft`
* `POST /api/awb/documents/[documentId]/issue`
* `GET/PATCH/POST /api/company/members`
* `POST /api/invite`
* `GET/PATCH/POST /api/notifications/*`
* `GET/PATCH/POST /api/user/*`

Server-side Supabase access patterns:

* direct Supabase REST calls with service role for privileged backend operations
* Supabase Auth user lookup through access token/cookie
* Supabase Storage service role for private file upload/delete/signed URLs

Do not move service-role operations to the browser.

---

## 37. Loading, Error, and Empty State Rules

Current UI patterns:

* upload/extraction has phase-specific loading and retry states
* dashboard has loading state while company context/API data is pending
* settings tables keep existing data visible during refresh when possible
* team member refresh disables only the refresh button
* notification errors should not break dashboard render
* source viewer shows explicit missing source message when no stored file is available

Rules for future optimization:

* do not redirect to login while auth/memberships are still loading
* do not repeatedly spam failed 401 requests
* show one clean session-expired message when truly unauthorized
* do not clear useful existing data during background refresh
* keep API error responses structured and user friendly

---

## 38. Backend Optimization Areas for Review

Potential backend improvements a developer can evaluate:

* replace repeated raw Supabase REST fetch helpers with a typed service client wrapper
* add shared request caching where safe for memberships/profile/company context
* move final AWB PDF generation behind an authenticated first-party API route
* reduce duplicate `GET /api/auth/memberships` calls between layout, dashboard, settings, and user menu
* add indexes only after measuring query plans; do not change schema blindly
* audit `AwbPaperContent.tsx` for legacy direct fetch calls and remove or isolate dead code carefully
* centralize AWB field schema/mapping in one module used by normalizer, paper UI, final PDF payload, validation, and dashboard stats
* consider background cleanup for orphaned source files if upload/persistence is interrupted
* add server-side pagination/filtering to history if row counts grow significantly
* add typed response contracts for core API routes

---

## 39. UI Optimization Areas for Review

Potential frontend improvements a developer can evaluate:

* split `app/dashboard/awb/page.tsx` into smaller components without changing behavior
* create reusable hooks for AWB extraction, document loading, draft save, issue flow, and PDF source loading
* centralize AWB review stats computation so summary chips, extracted fields, and paper form always agree
* replace repeated Tailwind fragments with small local components where it reduces bugs
* keep AWB paper layout stable by consolidating cell variants and border rules
* virtualize or paginate very large extracted-field lists if future schema grows
* reduce unnecessary re-renders caused by unstable context values or inline object dependencies
* keep left/right AWB workspace ratio intentional; do not accidentally switch from 60/40 to 50/50 unless product asks
* preserve the controlled PDF.js canvas for magnifier; do not return to native iframe magnifier
* ensure light and dark mode are both verified for every modal, chip, button, input, and card

---

## 40. Production Deployment Notes

Deployment target:

```text
Vercel
```

Production environment variables should include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
SITE_URL=
AWB_EXTRACTION_MODE=
AWB_EXTRACTION_API_URL=
AWB_EXTRACTION_TIMEOUT_MS=
AWB_EXTRACTION_API_KEY=
AWB_SOURCE_BUCKET=awb-source-documents
```

Notes:

* `AWB_SOURCE_BUCKET` is optional because code defaults to `awb-source-documents`
* production login requires env vars in Vercel, not only local `.env.local`
* after env var changes, redeploy the Vercel project
* the Supabase Storage bucket for AWB sources must be private
* service role key must never use a `NEXT_PUBLIC_` prefix
* build may need network access for Next Google font fetching

---

## 41. Current High-Risk Files

Be careful editing these files:

* `app/dashboard/awb/page.tsx` - large client component controlling upload, extraction, review, PDF viewer, draft, issue
* `app/dashboard/awb/components/AwbPaperContent.tsx` - dense AWB paper layout and field mapping
* `lib/awb/normalizeAwbExtraction.ts` - maps provider output to app field schema
* `lib/awb/persistence.ts` - document/field persistence, storage, history, issue/draft helpers
* `app/context/CompanyContext.tsx` - selected company and membership state
* `app/dashboard/layout.tsx` - dashboard shell, header, sidebar, notification/account controls
* `app/api/auth/login/route.ts` - session cookie creation
* `lib/auth.ts` - cookie/Bearer token extraction and user validation

For these files, prefer small diffs, targeted tests, and explicit before/after behavior checks.
