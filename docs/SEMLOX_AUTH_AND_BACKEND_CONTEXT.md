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

The first AWB Processing implementation supports:

```text
upload -> mock extraction -> normalized fields -> review
```

Configuration:

```env
AWB_EXTRACTION_MODE=mock
```

Supported mode names are `mock`, `live`, and `fallback`. Current behavior:

* `mock` uses the local fixture and never calls a live AI provider
* `fallback` currently uses the same local fixture until a live provider is configured
* `live` returns a structured not-configured error and consumes no API credits

The frontend sends the selected PDF/image to `POST /api/awb/extract` with `credentials: "include"`. The route authenticates through the existing cookie/Bearer helper, validates PDF/JPG/PNG/TIFF files up to 25 MB, and returns the stable SemLoX AWB extraction schema.

Raw provider responses must pass through `normalizeAwbExtractionResponse()` before reaching the Review Fields UI. The normalizer maps entity names, resolves duplicate fields by highest confidence, calculates status/colors and summary totals, and preserves safe run/timing metadata.

AWB extraction now persists to the focused `awb_documents` and `awb_fields` tables. Existing `documents`, `extraction_results`, `awbs`, and `awb_history` tables remain unchanged.

Persistence rules:

* extraction creates one company-scoped `awb_documents` row and one `awb_fields` row per normalized field
* `storage_path` remains null until an AWB storage bucket is configured; the selected browser file is still used for the current source preview
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
