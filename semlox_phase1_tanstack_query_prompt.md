# Semlox Phase 1 Performance Refactor Prompt

You are going to implement Phase 1 of a performance and server-state refactor in the existing Semlox Next.js application.

The goal is to introduce TanStack Query professionally and migrate only authenticated membership loading first.

Do not migrate all endpoints yet.

Do not redesign authentication.

Do not move server data into Zustand or Redux.

Do not change any existing business rules, role rules, company access rules, invitation behavior, or route permissions.

Before changing code, inspect the complete current implementation.

# Primary goal

Replace duplicated authenticated calls to:

```text
/api/auth/memberships
```

inside dashboard pages and CompanyContext with one shared TanStack Query cache.

After this phase:

- TanStack Query owns authenticated membership server state.
- CompanyContext owns only selected-company client state and persistence.
- Dashboard pages derive permissions and current membership from the cached memberships query.
- Active authentication/session behavior remains unchanged.
- Login, callback, password setup and invitation onboarding flows are not migrated unless strictly required for compilation.

# Step 1 — Inspect before editing

Inspect these files and all relevant imports:

```text
package.json
app/layout.tsx
app/dashboard/layout.tsx
app/context/CompanyContext.tsx
app/dashboard/page.tsx
app/dashboard/awb/page.tsx
app/dashboard/history/page.tsx
app/dashboard/settings/page.tsx
app/login/page.tsx
app/auth/callback/page.tsx
app/api/auth/memberships/route.ts
lib/authClient.ts
```

Also search repository-wide for:

```text
fetchMemberships(
/api/auth/memberships
useCompany(
CompanyProvider
selectedCompanyId
isHydrated
accepted_at
accept-invite
```

Before implementation, report:

1. Every current caller of `/api/auth/memberships`.
2. Which callers are authenticated dashboard consumers.
3. Which callers are login/callback/onboarding consumers.
4. Current CompanyContext responsibilities.
5. Existing membership response TypeScript shape.
6. Existing role and accepted-at checks performed by each page.
7. Whether a shared provider file already exists.

Do not begin editing until this mapping is complete.

# Step 2 — Add TanStack Query correctly

Install the current compatible version of:

```text
@tanstack/react-query
```

Do not install Redux, Zustand or SWR.

Create a small client provider, using the repository’s existing folder conventions.

Suggested responsibility:

```text
QueryClientProvider
```

The QueryClient must be created once per browser session, not recreated on every render.

Use safe initial defaults:

```ts
staleTime: 60_000
gcTime: 300_000
refetchOnWindowFocus: false
retry: 1
```

Do not use `refetchInterval` globally.

Mount the provider at the narrowest shared boundary that covers authenticated dashboard pages without unnecessarily affecting unrelated server components.

If mounting at the root layout is required, keep the wrapper minimal and preserve server component behavior.

Do not add React Query Devtools to production code in this phase.

# Step 3 — Create a typed memberships query

Create a dedicated query hook such as:

```text
hooks/queries/useMemberships.ts
```

Use the existing project naming and path conventions if different.

Requirements:

- Query key:

```ts
["auth", "memberships"]
```

- Call the existing first-party endpoint:

```text
/api/auth/memberships
```

- Include credentials where consistent with the current app.
- Preserve the exact current API response structure.
- Throw a useful Error for non-2xx responses.
- Do not expose sensitive session information.
- Do not call Supabase directly from the browser.
- Do not automatically redirect inside the query function.
- Do not run before authentication/dashboard mounting if the current architecture requires a guard.

Centralize the membership TypeScript type instead of duplicating slightly different interfaces across pages.

Do not alter `/api/auth/memberships` behavior in this phase unless a type-only adjustment is required.

# Step 4 — Create derived membership logic

Create a small derived hook or pure helper, for example:

```text
useCurrentMembership()
```

It should derive the selected company membership from:

```text
memberships
selectedCompanyId
```

It should not make another network request.

It must preserve all existing logic regarding:

- owner
- admin
- employee/member roles
- accepted membership rules
- company access
- user-level versus company-level views

Do not simplify role logic unless repository evidence proves duplication is exactly equivalent.

# Step 5 — Reduce CompanyContext

Refactor CompanyContext so it owns only client state:

```text
selectedCompanyId
setSelectedCompanyId
isHydrated
storage persistence/hydration
```

Move out:

```text
/api/auth/memberships fetch
server membership state
membership-derived role state
```

Handle invite acceptance cautiously.

Do not delete or relocate invite acceptance blindly.

First determine whether CompanyContext currently:

- checks pending invitations,
- automatically accepts one pending invite,
- calls `/api/auth/accept-invite`,
- refetches memberships,
- changes selectedCompanyId.

If invitation behavior is tightly coupled to CompanyContext, isolate it into a dedicated authenticated hook such as:

```text
useInviteAcceptance
```

Use a TanStack Query mutation only if it can preserve the exact current behavior.

Guard against loops:

```text
memberships fetch
→ invite mutation
→ query invalidation
→ refetch
→ repeated invite mutation
```

The same pending membership must not be accepted repeatedly.

Do not change the current product decision regarding automatic acceptance.

# Step 6 — Migrate authenticated dashboard consumers only

Convert these pages to the shared query:

```text
app/dashboard/page.tsx
app/dashboard/awb/page.tsx
app/dashboard/history/page.tsx
app/dashboard/settings/page.tsx
```

For each page:

- remove direct `fetchMemberships()` calls,
- use the shared membership query,
- preserve current loading behavior initially,
- preserve authorization and redirect behavior,
- preserve role calculations,
- preserve selected-company fallback logic,
- preserve company-switch behavior.

Do not migrate these unless required:

```text
app/login/page.tsx
app/auth/callback/page.tsx
```

Those flows establish authentication and may not sit under the authenticated Query provider. Leave them unchanged in Phase 1.

# Step 7 — Prevent request waterfalls

After membership migration, page data queries should wait only for the minimum required values:

```text
membership query completed
selectedCompanyId resolved
permission confirmed
```

Do not add dashboard/history/AWB TanStack queries yet.

Keep their existing data fetch logic for this phase.

The only server-state migration in this phase is memberships.

# Step 8 — Loading-state requirements

Do not redesign the UI in this phase.

However, ensure there is no permanent spinner caused by inconsistent loading flags.

For every migrated page, distinguish:

```text
CompanyContext hydration
Membership query loading
Permission resolution
Page data loading
Error state
```

Do not treat a membership API error as endless loading.

Maintain current redirects for unauthorized users.

# Step 9 — Cache and invalidation

Any existing operation that changes memberships must invalidate:

```ts
["auth", "memberships"]
```

Examples may include:

- accepting an invitation,
- membership role changes,
- membership removal,
- company switching only if it changes server membership state.

Changing `selectedCompanyId` alone must not refetch memberships because memberships are user-level data.

Do not invalidate the membership query on every route navigation.

# Step 10 — Verification

Run:

```bash
npm run lint
npm run build
```

Also perform repository-wide searches to confirm:

1. Authenticated dashboard pages no longer call `fetchMemberships()` directly.
2. CompanyContext no longer fetches `/api/auth/memberships`.
3. The endpoint is now called through the shared query hook for dashboard usage.
4. Login/callback behavior remains untouched unless explicitly documented.
5. No Redux, Zustand or SWR package was added.
6. No membership role or accepted-at rule was removed.
7. No auth tokens were moved into client state.
8. No infinite invitation/refetch loop exists.

If authenticated browser testing is available, verify:

```text
Login
→ dashboard
→ AWB
→ history
→ settings
→ dashboard
```

Record the number of `/api/auth/memberships` calls.

Expected behavior:

- normally one request during the cache freshness period,
- no new membership request on each dashboard route navigation,
- refetch only after stale time, explicit invalidation or remount conditions.

Do not claim this runtime result unless actually measured.

# Required final response

Return:

## Files inspected

## Current duplicate-membership architecture

## Files changed

## TanStack Query provider placement

## Membership query implementation

## CompanyContext before and after

## Invitation behavior preservation

## Dashboard pages migrated

## Repository-wide request search results

## Lint result

## Build result

## Runtime test result

## Remaining risks

## Exact diff summary

Be explicit about any part you could not test.

Do not begin migrating profile, notifications, dashboard data, history data or AWB document data in this phase.
