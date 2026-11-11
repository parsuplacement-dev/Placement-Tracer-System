# Placement Tracer System

Production-oriented graduate tracer study administration and alumni response system for the Partido State University Placement Unit. It is a Next.js 16 App Router application backed by Supabase Auth/PostgreSQL and Google Drive.

This README is the operational and developer handoff document. The UI rules are in [`design.md`](design.md), the versioned database history is in [`supabase/migrations`](supabase/migrations), and the complete maintained-file inventory is at the end of this document.

## What the system does

- Signs in users with personal or university Google accounts through Google and Supabase Auth.
- Maintains provider-neutral application accounts with `admin`, `coordinator`, and `alumni` roles.
- Gives coordinators the union of campus-, college-, and program-level grants assigned by an administrator.
- Publishes immutable, versioned tracer forms into manually opened or closed academic-year study periods.
- Lets alumni save drafts, submit responses, update an open response, attach evidence, and delete their own response.
- Lets staff search, filter, inspect, edit, transcribe, import, export, organize, and delete responses within their access scope.
- Lets administrators manage accounts, study periods, and the indexed Google Drive file browser.
- Stores response data and lifecycle state in PostgreSQL while storing uploaded file content in Google Drive.
- Tracks retryable import, Drive organization, direct-upload, and deletion states instead of silently losing work.
- Exports accounts and responses as styled Excel workbooks and protects spreadsheet cells from formula injection.

## Technology and runtime

| Area              | Implementation                                                                |
| ----------------- | ----------------------------------------------------------------------------- |
| Web framework     | Next.js `16.2.9`, App Router, React `19.2.4`, TypeScript 5                    |
| Styling           | Tailwind CSS 4, semantic CSS variables, Base UI, shadcn configuration         |
| Forms             | React Hook Form and Zod                                                       |
| Server data       | Supabase PostgreSQL through a server-only service credential                  |
| Authentication    | Supabase Auth with Google OAuth; provider-neutral application account adapter |
| File storage      | Google Drive API with resumable browser-to-Drive uploads                      |
| Exports           | ExcelJS, `csv-stringify` support utilities                                    |
| Charts and motion | Recharts, Motion, AnimateIcons/Lucide mapping                                 |
| Tests             | Node's built-in test runner                                                   |

Minimum supported Node.js version is **20.9**. Use the lockfile and `npm ci` for reproducible installs.

## Architecture

```text
Browser
  -> proxy.ts: optimistic cookie check, origin/body guards, coarse rate limits
  -> App Router pages and route handlers
       -> lib/auth: verified user and role/scope authorization
       -> lib/repositories: all Supabase persistence
       -> lib/forms: definition adapter, validation, lifecycle rules
       -> lib/google-drive: managed folders, uploads, index, cleanup
  -> Supabase Auth + PostgreSQL             Google Drive
       identity, roles, answers,             uploaded documents and
       indexes, audit/lifecycle state         managed file hierarchy
```

`proxy.ts` is deliberately an optimistic edge guard, not the authorization boundary. Every protected page and API handler verifies the current user again, and API handlers enforce role and organizational scope before reading or mutating data.

The `app` directory is routing only. Reusable UI lives in `components`, domain and infrastructure code lives in `lib`, shared contracts live in `types`, and all database changes are append-only SQL migrations.

### Roles and access

| Capability                               |    Admin     |      Coordinator      |  Alumni  |
| ---------------------------------------- | :----------: | :-------------------: | :------: |
| Own dashboard, settings, session         |     Yes      |          Yes          |   Yes    |
| Complete own active tracer response      |      No      |          No           |   Yes    |
| View/manage responses                    |     All      | Granted programs only | Own only |
| Enter manual responses                   | All programs | Granted programs only |    No    |
| Export response data                     |     All      | Granted programs only |    No    |
| Manage accounts and access grants        |     Yes      |          No           |    No    |
| Manage/open/close/archive/delete studies |     Yes      |          No           |    No    |
| Browse/manage Admin Files in Drive       |     Yes      |          No           |    No    |

Coordinator access is the deduplicated union of every valid grant in `coordinator_scope_grants`. The canonical campus/college/program mapping is in `lib/programs/catalog.ts`; change that catalog and its validation together.

### Main workflows

1. **Authentication:** Supabase completes Google OAuth, accepts only verified ParSU-domain identities, and links the provider user to `auth_accounts` by provider ID or normalized email.
2. **Study administration:** an admin creates a study against a published form version, initializes its Drive hierarchy, and manually opens or closes it.
3. **Alumni response:** an alumni user loads the open study, saves a draft or submits validated answers, uploads documents through a resumable Drive session, and triggers background Drive organization.
4. **Manual response:** staff create one retryable draft per staff member/study, attach imported evidence, then complete the import and organization lifecycle.
5. **Deletion:** the database first claims a deletion, Drive cleanup runs, and failure state is retained for retry. Study deletion similarly checks/cleans linked Drive data.
6. **Exports:** server routes apply authorization and filters, record an audit event, protect spreadsheet values, and return an `.xlsx` file.

### Google Drive layout

The configured `GOOGLE_DRIVE_ROOT_FOLDER_ID` is the only managed root. The application creates/indexes a hierarchy equivalent to:

```text
Configured Drive root
├── Upload Staging
├── <study academic year/title>
│   └── <campus>/<college>/<program>/<respondent>
│       ├── Employment
│       └── Awards
└── Admin Files
    └── <academic year>/<campus>/<college>/<program>
```

Folder IDs are coordinated in `google_drive_folders`; browsable metadata is mirrored in `google_drive_items`. Admin file mutations are limited to indexed descendants of `Admin Files`. Do not manually move managed response folders unless you are prepared to reconcile the index.

## Local setup

### 1. Prerequisites

- Node.js 20.9 or newer and npm.
- A Supabase project, or the Supabase CLI plus Docker for the local stack.
- A Google Cloud project with OAuth consent and Google Drive API enabled.
- Access to the Drive folder that will become the managed root.

### 2. Install and configure

```sh
git clone <repository-url>
cd Tracer-System
npm ci
```

Copy `.env.example` to `.env.local` and fill in the values. Environment files are ignored by Git; never commit them.

| Variable                      | Required | Purpose                                                                                                 |
| ----------------------------- | :------: | ------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                |   Yes    | Supabase project API URL.                                                                               |
| `SUPABASE_PUBLISHABLE_KEY`    |   Yes    | Server-side session client key used with Supabase SSR cookies.                                          |
| `SUPABASE_SECRET_KEY`         |   Yes    | Server-only privileged database key. Never expose with `NEXT_PUBLIC_`.                                  |
| `GOOGLE_DRIVE_CLIENT_ID`      |   Yes    | OAuth client used to authorize Drive access.                                                            |
| `GOOGLE_DRIVE_CLIENT_SECRET`  |   Yes    | Server-only OAuth client secret.                                                                        |
| `GOOGLE_DRIVE_REDIRECT_URI`   |   Yes    | Exact Drive callback, normally `http://localhost:3000/api/auth/google-drive/callback` locally.          |
| `GOOGLE_DRIVE_REFRESH_TOKEN`  |   Yes    | Long-lived token used by the server's Drive client.                                                     |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` |   Yes    | ID of the root folder managed by this application.                                                      |
| `TRUST_PROXY_HEADERS`         |    No    | Set only behind a trusted proxy that overwrites forwarded IP headers. Vercel is detected automatically. |

`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY` are used only by the one-time legacy account migration script.

### 3. Apply the database

Migrations are ordered by their timestamped filename and are append-only. The form definition is seeded by a migration; `supabase/seed.sql` is intentionally not used.

For a new local Supabase stack:

```sh
npx supabase start
npx supabase db reset
```

For a linked hosted project, review the target first and then apply pending migrations with the Supabase CLI:

```sh
npx supabase migration list
npx supabase db push
```

Test migration changes against a disposable project before production. Never edit a migration that has already run in a shared environment; add a new migration.

### 4. Configure Google sign-in

1. Enable Google in Supabase Authentication and supply the Google OAuth client ID/secret requested there.
2. Add the Supabase-provided provider callback URL to the OAuth client's authorized redirect URIs in Google Cloud.
3. In Supabase URL Configuration, set the production Site URL and allow `http://localhost:3000/api/auth/google/callback` plus the production equivalent.
4. Sign-in accepts personal and university Google accounts; the application does not restrict email domains.

### 5. Authorize Google Drive

1. Enable the Google Drive API and configure an OAuth client whose exact callback matches `GOOGLE_DRIVE_REDIRECT_URI`.
2. Start the application on a loopback host.
3. Visit `/api/auth/google-drive`. This setup endpoint intentionally rejects non-loopback hosts.
4. Complete consent, copy the returned refresh token into `.env.local`, and restart the server.
5. Ensure the consenting Google account can edit `GOOGLE_DRIVE_ROOT_FOLDER_ID`.

Do not expose the Drive setup route through a tunnel. Store the production refresh token in the hosting provider's encrypted environment settings.

### 6. Bootstrap the first administrator

New Google users default to `alumni`. After the intended first administrator signs in once, promote that exact account from the Supabase SQL editor, then sign out and back in:

```sql
update public.auth_accounts
set role = 'admin'
where lower(email) = lower('administrator@parsu.edu.ph');
```

Verify that exactly one intended row changed. Future roles and coordinator grants must be managed through `/admin/accounts`.

### 7. Run the application

```sh
npm run dev
```

Open `http://localhost:3000`. The first admin should create a study, initialize the Drive hierarchy if prompted, and open the study before alumni can respond.

## Commands

| Command                    | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `npm run dev`              | Start the Next.js development server.                              |
| `npm run build`            | Create and type-check the production build.                        |
| `npm run start`            | Serve a completed production build.                                |
| `npm run lint`             | Run ESLint across the repository.                                  |
| `npm test`                 | Run all Node test files under `lib/**/*.test.ts`.                  |
| `npm run test:forms`       | Alias for the full test command.                                   |
| `npm run format`           | Rewrite files with Prettier.                                       |
| `npm run format:check`     | Check formatting without rewriting.                                |
| `npm run migrate:accounts` | Dry-run legacy Appwrite account import. Add `-- --apply` to write. |

Before merging or deploying:

```sh
npm run lint
npm test
npm run format:check
npm run build
npm audit --omit=dev
```

## Deployment

This application requires a Node.js-compatible server runtime because it uses Route Handlers, server-side authentication, PostgreSQL, and Google APIs. It is not a static-export application.

1. Provision the Supabase project and apply all migrations.
2. Configure Supabase Google authentication and production allow-listed callbacks.
3. Add all eight required environment variables to the host; do not upload local `.env*` files.
4. Set the Drive callback URI and OAuth client redirect URI to the exact production URL.
5. Build with `npm run build` and run with `npm run start`, or use the equivalent Vercel deployment.
6. Verify sign-in, an alumni draft save, a small document upload, an admin export, and Drive organization.
7. Add a provider/edge rate limiter for multi-instance production. The built-in limiter is in-memory and only coarse per instance.

If self-hosting behind a reverse proxy, leave `TRUST_PROXY_HEADERS` unset unless that proxy strips client-supplied forwarding headers and writes trusted values. TLS must terminate before application traffic reaches users.

## Data model

| Relation                       | Responsibility                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `auth_accounts`                | Stable application identity, provider mapping, role, status, profile, and role-change notice.    |
| `coordinator_scope_grants`     | Campus/college/program grants assigned to coordinator accounts.                                  |
| `form_definitions`             | Stable form identity such as `graduate-tracer`.                                                  |
| `form_versions`                | Immutable published JSON definitions.                                                            |
| `study_periods`                | Academic-year instance, selected version, manual lifecycle, and archive state.                   |
| `form_responses`               | Alumni/manual answers plus submission, import, deletion, and Drive-organization lifecycle state. |
| `form_response_documents`      | Document metadata and Drive IDs for employment/award evidence.                                   |
| `direct_drive_upload_sessions` | Short-lived resumable upload state and finalization ownership.                                   |
| `google_drive_folders`         | Idempotent managed-folder registry.                                                              |
| `google_drive_items`           | Searchable/indexed Drive tree used by the file browser and ancestry checks.                      |
| `security_audit_events`        | Append-only actor snapshots and metadata for completed user-facing business operations.          |

Important views/functions are `admin_response_summaries`, `study_periods_with_status`, `study_contexts`, `study_period_summaries`, `save_alumni_form_response`, `delete_study_period`, `replace_account_access`, `indexed_drive_ancestry`, and `is_indexed_drive_descendant`.

All application relations have RLS enabled and browser roles have no application-table grants. The server uses `SUPABASE_SECRET_KEY`; authorization therefore belongs in server code and must never be omitted on the assumption that RLS will recover it.

## Web routes

| Route                     | Access            | Purpose                                                                |
| ------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `/signin`                 | Public            | Google sign-in and usage terms.                                        |
| `/`                       | Signed in         | Role-aware redirect to the correct dashboard.                          |
| `/admin`                  | Admin/coordinator | Staff metrics and recent responses.                                    |
| `/admin/accounts`         | Admin             | Account, role, status, and coordinator-grant management.               |
| `/admin/files`            | Admin             | Indexed Drive browser and Admin Files management.                      |
| `/admin/responses`        | Admin/coordinator | Search, filter, export, inspect, and delete authorized responses.      |
| `/admin/responses/manual` | Admin/coordinator | Full-page manual response entry.                                       |
| `/admin/responses/[id]`   | Admin/coordinator | Authorized response workspace.                                         |
| `/admin/settings`         | Admin/coordinator | Profile, preferences, help, sessions, and the admin-only activity log. |
| `/admin/studies`          | Admin             | Create, edit, open/close, archive, and delete studies.                 |
| `/alumni`                 | Alumni            | Alumni dashboard and active-study status.                              |
| `/alumni/responses`       | Alumni            | Own draft/submitted response workspace.                                |
| `/alumni/settings`        | Alumni            | Profile, appearance, motion, help, and session actions.                |
| `/alumni/survey`          | Alumni            | Permanent compatibility redirect to `/alumni/responses`.               |
| `/unauthorized`           | Signed in         | Role/access error page.                                                |

## API routes

Every `/api` request passes through body-size, same-origin mutation, cookie, and rate-limit guards in `proxy.ts`; handlers still perform authoritative authentication and authorization.

| Method and path                                                                       | Access/purpose                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/auth/google`                                                                | Begin Supabase Google sign-in.                                        |
| `GET /api/auth/google/callback`                                                       | Exchange OAuth code, link account, set session, and redirect by role. |
| `GET /api/auth/google-drive`                                                          | Loopback-only Drive consent bootstrap.                                |
| `GET /api/auth/google-drive/callback`                                                 | Return the Drive refresh token from bootstrap consent.                |
| `POST /api/auth/logout`                                                               | Revoke/sign out and clear the session cookie.                         |
| `GET /api/auth/me`                                                                    | Return the current application user.                                  |
| `GET /api/auth/me-id`                                                                 | Return the stable application user ID.                                |
| `POST /api/auth/refresh`                                                              | Refresh the Supabase session.                                         |
| `POST /api/auth/role-change-notice`                                                   | Consume the signed-in user's pending role notice.                     |
| `GET /api/auth/session-expired`                                                       | Clear session state and redirect to sign-in.                          |
| `GET /api/forms/[slug]/active`                                                        | Alumni active study, form definition, and own response.               |
| `GET, PUT, DELETE /api/studies/[studyId]/response`                                    | Read/save/delete the alumni user's study response.                    |
| `GET, PUT, DELETE /api/studies/[studyId]/responses`                                   | Plural compatibility alias of the preceding endpoint.                 |
| `POST /api/form-responses/[responseId]/documents`                                     | Returns `410`; retired multipart upload compatibility endpoint.       |
| `POST /api/form-responses/[responseId]/documents/upload-session`                      | Create an authorized resumable Drive upload.                          |
| `POST /api/form-responses/[responseId]/documents/upload-session/[sessionId]/finalize` | Verify Drive content and commit document metadata.                    |
| `DELETE /api/form-responses/[responseId]/documents/[documentId]`                      | Delete authorized response evidence.                                  |
| `GET /api/admin/accounts`                                                             | Admin account list.                                                   |
| `GET /api/admin/audit-events`                                                         | Admin-only filtered and paginated activity log.                       |
| `GET /api/admin/accounts/export`                                                      | Admin account workbook export.                                        |
| `GET, PATCH, DELETE /api/admin/accounts/[id]`                                         | Read/update/delete an account with safety checks.                     |
| `GET /api/admin/studies`                                                              | Authorized study list.                                                |
| `POST /api/admin/studies`                                                             | Admin study creation and background Drive initialization.             |
| `PATCH, DELETE /api/admin/studies/[studyId]`                                          | Admin study edit/delete.                                              |
| `PATCH /api/admin/studies/[studyId]/status`                                           | Admin open/close transition.                                          |
| `POST /api/admin/studies/[studyId]/archive`                                           | Admin archive transition.                                             |
| `POST /api/admin/studies/[studyId]/responses/manual`                                  | Create/complete an authorized manual response.                        |
| `GET /api/admin/responses`                                                            | Scoped, paginated response list.                                      |
| `GET /api/admin/responses/export`                                                     | Scoped response workbook export.                                      |
| `GET /api/admin/responses/manual-draft`                                               | Resume the staff member's latest authorized manual draft.             |
| `GET, PATCH, DELETE /api/admin/responses/[id]`                                        | Authorized response read/edit/delete.                                 |
| `PATCH /api/admin/responses/[id]/import`                                              | Finalize or retry a manual import lifecycle.                          |
| `POST /api/admin/responses/[id]/organize`                                             | Retry Drive organization.                                             |
| `GET /api/admin/files`                                                                | Admin indexed folder listing/search.                                  |
| `GET /api/admin/files/folders`                                                        | Admin folder options for move operations.                             |
| `POST /api/admin/files/folder`                                                        | Create a folder under an authorized Admin Files location.             |
| `POST /api/admin/files/upload`                                                        | Validate and upload an admin file.                                    |
| `POST /api/admin/files/generate`                                                      | Generate Admin Files hierarchy and refresh the index.                 |
| `POST /api/admin/files/initialize`                                                    | Initialize study Drive hierarchies and refresh the index.             |
| `PATCH, DELETE /api/admin/files/[fileId]`                                             | Rename/move or delete an indexed Admin Files item.                    |
| `GET /api/admin/files/[fileId]/content`                                               | Authorized streamed/preview file content.                             |

## Activity auditing

The application records completed user-facing business operations in the append-only `security_audit_events` table. Each event contains the stable actor account ID, an actor name/email snapshot, an action name, a target type and ID when available, limited operation metadata, and the server-generated timestamp.

Audit coverage includes:

- Google sign-in and sign-out.
- Account name, role/access, export, and deletion operations.
- Study creation, scheduling, open/close, archive, and deletion operations.
- Alumni response saves/submissions and response deletions.
- Manual response creation, editing, import-state changes, organization, and deletion.
- Response-document upload finalization and deletion.
- Response exports.
- Admin Files uploads, folder creation, rename, move, deletion, hierarchy generation, and initialization.

Administrators can review the log in **Admin > Settings > Activity log**. The view supports server-side search, activity-type filtering, pagination, expandable metadata, and current-locale timestamps. Coordinators cannot see the log, and the backing `GET /api/admin/audit-events` route independently requires administrator access.

Audit metadata must not contain survey answers, authentication tokens, filenames, uploaded content, or other unnecessary sensitive payloads. Events describe the operation and its affected record rather than duplicating the underlying data. Routine session refreshes, read-only page views, unfinished upload sessions, and UI clicks are intentionally excluded because they are not completed business transactions.

`20260810000000_expand_security_audit_events.sql` backfills available actor snapshots for existing events, adds searchable/indexed fields, revokes mutation privileges, and installs a database trigger that rejects updates or deletions. Apply this migration before deploying application code that writes or reads the expanded audit fields.

## Security invariants

- Never add `NEXT_PUBLIC_` to any current environment variable.
- Never use `proxy.ts` cookie presence as proof of identity or role.
- Every staff read/write must call the authorization helpers and apply allowed-program scope.
- Alumni ownership uses the stable `auth_accounts.id`, not the replaceable provider UUID.
- Published form versions are immutable; create a new version for schema changes.
- Mutations to closed/archived studies are constrained in both API/domain logic and PostgreSQL triggers.
- Uploads are limited to 10 MB and validated by extension, MIME type, and recognized file signature.
- Drive operations must stay under the configured/indexed managed roots.
- Destructive operations use confirmation phrases and lifecycle claims where implemented.
- Exported text must pass through spreadsheet-injection protection.
- Completed user-facing mutations, exports, and authentication transitions should be written to `security_audit_events` without answers, tokens, filenames, or file contents.

The application sets CSP, referrer, permissions, frame, and content-type response headers in `next.config.ts`. The file-content preview route has a separate restrictive policy.

## Operations, backup, and recovery

### Routine checks

- Check application and hosting logs for repeated `401`, `403`, `413`, `429`, and Drive/Supabase timeout failures.
- Check `form_responses` for `import_status = 'failed'`, `deletion_status = 'delete_failed'`, or `drive_organization_status = 'failed'`.
- Check expired/non-finalized `direct_drive_upload_sessions` and staged documents; cleanup helpers are in `lib/google-drive`.
- Confirm the Drive index still points to the configured root after any credential or folder-owner change.
- Review `security_audit_events` and administrator/coordinator membership periodically.
- Run dependency and quality gates before each deployment.

### Backup

Back up both systems together:

1. Take a Supabase database backup/export.
2. Back up or copy the configured Google Drive root while preserving folder/file IDs where possible.
3. Record the deployed Git commit, migration list, runtime environment variable names, Supabase project reference, Google Cloud project/client, Drive root URL, hosting project, and responsible owners.

Database rows contain Drive IDs; a database-only restore does not restore file content, and a Drive-only restore does not restore ownership/lifecycle metadata.

### Credential rotation

If a credential or environment file is exposed, rotate the Supabase secret, Google OAuth client secret, and Drive refresh token as applicable, update the hosting environment, redeploy/restart, and verify OAuth plus a Drive operation. Do not send secrets in source control, issue trackers, screenshots, or this README.

### Troubleshooting

| Symptom                                 | Check                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Sign-in loops or `oauth_failed`         | Supabase Google provider, Site URL/redirect allow-list, exact callback, and system clock.              |
| User signs in as alumni unexpectedly    | `auth_accounts.role`; role changes require a fresh session/navigation.                                 |
| Coordinator sees too much/little        | Grant shapes in `coordinator_scope_grants` and matching values in `lib/programs/catalog.ts`.           |
| No active tracer form                   | Study exists, is not archived, uses a published version, and `lifecycle_status` is `open`.             |
| Draft reports a conflict                | Another tab/session saved newer `updated_at` content; reload before overwriting.                       |
| Drive authorization fails               | Exact redirect URI, API enabled, consent/scopes, refresh-token validity, and root-folder permission.   |
| File is missing from browser            | Drive index sync, correct Admin Files ancestry, root ID, and `google_drive_items.last_synced_at`.      |
| Upload stalls/fails                     | 10 MB limit, allowed MIME/signature, resumable session expiry/origin, Drive quota, and staging folder. |
| Export is rejected                      | Role/scope, filter parameters, rate limit, and external-service timeout.                               |
| `supabase db reset` asks for `seed.sql` | Ensure current `supabase/config.toml` has `[db.seed] enabled = false`; form data is migration-seeded.  |

## Change guide

- **New page/API:** follow the installed Next.js 16 docs under `node_modules/next/dist/docs` before relying on older conventions; Next 16 uses `proxy.ts`, not `middleware.ts`.
- **New UI:** read `design.md`, reuse `components/ui`, import icons through `components/ui/icons.tsx`, and test all themes plus reduced motion.
- **New field:** update the versioned JSON form definition, survey type/defaults, adapter, validation schema, relevant section component, exports, and tests. Publish a new form version for deployed schema changes.
- **New program:** update both `PROGRAMS` and `PROGRAM_FOLDER_MAP`, then verify grant validation, export filters, and Drive hierarchy naming.
- **New persistence:** add a repository function and a new migration with RLS/grants/indexes; never query Supabase directly from a client component.
- **New Drive operation:** enforce root/ancestry authorization, update both folder/item indexes, make retries idempotent, and retain observable failure state.
- **Auth provider change:** implement `AuthProvider` in `lib/auth/types.ts`, keep stable application IDs, and switch only `lib/auth/provider.ts`.

## Intentional compatibility code

Do not remove these as "unused" without a migration plan:

- `/alumni/survey` permanently redirects old bookmarks.
- `/api/studies/[studyId]/responses` aliases the original singular response route.
- The retired multipart document POST returns `410` so old clients fail clearly.
- `scripts/migrate-appwrite-accounts.ts` is a one-time/dry-run migration and historical recovery tool.
- `types/survey.ts` and `lib/surveys/defaults.ts` remain the typed runtime answer model used by current forms.
- `CLAUDE.md` delegates coding-agent instructions to `AGENTS.md`.

## Handoff checklist

The outgoing maintainer should transfer these through approved secure channels, not Git:

- Repository ownership and branch/deployment protections.
- Hosting project and production domain/DNS access.
- Supabase organization/project ownership, database backups, and authentication configuration.
- Google Cloud project, OAuth consent screen, OAuth client ownership, and Drive API quota access.
- Ownership/editor access to the configured Drive root.
- The eight production environment values and rotation procedure.
- The current first/backup administrator accounts and intended coordinator grants.
- Monitoring/log access, incident contacts, privacy/data-retention policy, and backup schedule.
- Deployed commit SHA, applied migration list, and a completed smoke-test record.

Before accepting the handoff, the new owner should restore the project in a clean environment, run all quality gates, deploy, sign in as each role, save/submit a test response, upload/delete a test document, exercise scoped coordinator access, export data, and confirm backups can be restored.

## Complete maintained-file inventory

This inventory covers every source, configuration, migration, test, and asset that belongs in the repository. It intentionally excludes regenerated or machine-local content: `.git/`, `.agents/`, `.next/`, `node_modules/`, `supabase/.temp/`, `next-env.d.ts`, `*.tsbuildinfo`, and secret `.env*` files other than `.env.example`.

### Root

| File                 | Responsibility                                                                     |
| -------------------- | ---------------------------------------------------------------------------------- |
| `.env.example`       | Empty, safe environment-variable template.                                         |
| `.gitignore`         | Excludes dependencies, output, caches, local secrets, and prototypes.              |
| `AGENTS.md`          | Repository-specific instruction to consult installed Next.js docs.                 |
| `CLAUDE.md`          | Points compatible coding agents to `AGENTS.md`.                                    |
| `README.md`          | Developer, operator, deployment, recovery, API, and file-inventory handoff.        |
| `design.md`          | Visual system, components, accessibility, motion, and UI QA contract.              |
| `components.json`    | shadcn/Base UI aliases and generator configuration.                                |
| `eslint.config.mjs`  | ESLint configuration based on Next.js core-web-vitals and TypeScript rules.        |
| `next.config.ts`     | Next image allow-list and application/file-preview security headers.               |
| `package.json`       | Runtime/dev dependencies and executable scripts.                                   |
| `package-lock.json`  | Reproducible npm dependency graph; update only through npm.                        |
| `postcss.config.mjs` | Tailwind PostCSS plugin configuration.                                             |
| `proxy.ts`           | Next.js 16 request proxy: optimistic auth, request guards, and coarse rate limits. |
| `tsconfig.json`      | Strict TypeScript, App Router plugin, and `@/*` path alias configuration.          |

### App pages and layouts

| File                                              | Responsibility                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `app/layout.tsx`                                  | Root metadata, theme bootstrap, motion bootstrap, and toast/motion providers.    |
| `app/globals.css`                                 | Tailwind import, semantic tokens, themes, elevation, controls, and motion rules. |
| `app/favicon.ico`                                 | Browser/application favicon.                                                     |
| `app/error.tsx`                                   | Root route error boundary.                                                       |
| `app/global-error.tsx`                            | Last-resort document-level error boundary.                                       |
| `app/not-found.js`                                | Global 404 page.                                                                 |
| `app/(auth)/layout.tsx`                           | Signed-out presentation shell and floating theme toggle.                         |
| `app/(auth)/loading.js`                           | Sign-in route loading state.                                                     |
| `app/(auth)/signin/page.tsx`                      | Google sign-in, purpose, privacy, and usage terms.                               |
| `app/(protected)/layout.tsx`                      | Verified dashboard shell, navigation, keep-alive, and role notice.               |
| `app/(protected)/page.tsx`                        | Role-aware root redirect.                                                        |
| `app/(protected)/error.tsx`                       | Protected-area error boundary.                                                   |
| `app/(protected)/unauthorized.tsx`                | 403/access-denied page.                                                          |
| `app/(protected)/admin/layout.tsx`                | Admin/coordinator role gate.                                                     |
| `app/(protected)/admin/page.tsx`                  | Scoped staff dashboard and metrics.                                              |
| `app/(protected)/admin/accounts/layout.tsx`       | Administrator-only account section gate.                                         |
| `app/(protected)/admin/accounts/page.tsx`         | Account search, filter, export, and table host.                                  |
| `app/(protected)/admin/files/page.tsx`            | Administrator-only Drive browser host.                                           |
| `app/(protected)/admin/responses/page.tsx`        | Scoped response list/filter/export host.                                         |
| `app/(protected)/admin/responses/manual/page.tsx` | Manual response entry page.                                                      |
| `app/(protected)/admin/responses/[id]/page.tsx`   | Authorized response-detail workspace loader.                                     |
| `app/(protected)/admin/settings/page.tsx`         | Staff settings loader.                                                           |
| `app/(protected)/admin/studies/page.tsx`          | Administrator study scheduler loader.                                            |
| `app/(protected)/alumni/layout.tsx`               | Alumni role gate.                                                                |
| `app/(protected)/alumni/page.tsx`                 | Alumni dashboard and study status.                                               |
| `app/(protected)/alumni/responses/page.tsx`       | Own response/study workspace loader.                                             |
| `app/(protected)/alumni/settings/page.tsx`        | Alumni settings loader.                                                          |
| `app/(protected)/alumni/survey/page.tsx`          | Permanent legacy redirect.                                                       |

### API handlers

| File                                                                                         | Responsibility                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `app/api/auth/google/route.ts`                                                               | Start Supabase Google OAuth.                                   |
| `app/api/auth/google/callback/route.ts`                                                      | Complete OAuth and route by account role.                      |
| `app/api/auth/google-drive/route.ts`                                                         | Loopback-only Drive OAuth bootstrap.                           |
| `app/api/auth/google-drive/callback/route.ts`                                                | Complete Drive consent and display refresh-token setup result. |
| `app/api/auth/logout/route.ts`                                                               | Sign out and clear cookies.                                    |
| `app/api/auth/me/route.ts`                                                                   | Current-user JSON.                                             |
| `app/api/auth/me-id/route.ts`                                                                | Stable current-user ID JSON.                                   |
| `app/api/auth/refresh/route.ts`                                                              | Refresh session cookies.                                       |
| `app/api/auth/role-change-notice/route.ts`                                                   | Consume role change notice.                                    |
| `app/api/auth/session-expired/route.ts`                                                      | Clear expired session and redirect.                            |
| `app/api/forms/[slug]/active/route.ts`                                                       | Active alumni form/study/response lookup.                      |
| `app/api/studies/[studyId]/response/route.ts`                                                | Alumni response read, save/submit, and deletion.               |
| `app/api/studies/[studyId]/responses/route.ts`                                               | Plural response-route compatibility re-export.                 |
| `app/api/form-responses/[responseId]/documents/route.ts`                                     | Retired upload endpoint with explicit `410`.                   |
| `app/api/form-responses/[responseId]/documents/[documentId]/route.ts`                        | Authorized document deletion.                                  |
| `app/api/form-responses/[responseId]/documents/upload-session/route.ts`                      | Create direct/resumable upload session.                        |
| `app/api/form-responses/[responseId]/documents/upload-session/[sessionId]/finalize/route.ts` | Verify and finalize direct upload.                             |
| `app/api/admin/accounts/route.ts`                                                            | Administrator account listing.                                 |
| `app/api/admin/audit-events/route.ts`                                                        | Admin-only activity-log query.                                 |
| `app/api/admin/accounts/export/route.ts`                                                     | Audited account workbook export.                               |
| `app/api/admin/accounts/[id]/route.ts`                                                       | Account read, access update, and safe deletion.                |
| `app/api/admin/studies/route.ts`                                                             | Staff study list and admin creation.                           |
| `app/api/admin/studies/[studyId]/route.ts`                                                   | Admin study update/deletion.                                   |
| `app/api/admin/studies/[studyId]/archive/route.ts`                                           | Admin study archive.                                           |
| `app/api/admin/studies/[studyId]/status/route.ts`                                            | Admin manual open/close transition.                            |
| `app/api/admin/studies/[studyId]/responses/manual/route.ts`                                  | Scoped manual response creation/completion.                    |
| `app/api/admin/responses/route.ts`                                                           | Scoped, filtered response listing.                             |
| `app/api/admin/responses/export/route.ts`                                                    | Scoped, audited response workbook export.                      |
| `app/api/admin/responses/manual-draft/route.ts`                                              | Staff manual-draft resume data.                                |
| `app/api/admin/responses/[id]/route.ts`                                                      | Scoped response read/update/deletion.                          |
| `app/api/admin/responses/[id]/import/route.ts`                                               | Manual import finalization/retry.                              |
| `app/api/admin/responses/[id]/organize/route.ts`                                             | Drive organization retry.                                      |
| `app/api/admin/files/route.ts`                                                               | Indexed admin file listing/search.                             |
| `app/api/admin/files/folder/route.ts`                                                        | Authorized folder creation.                                    |
| `app/api/admin/files/folders/route.ts`                                                       | Authorized destination-folder options.                         |
| `app/api/admin/files/generate/route.ts`                                                      | Admin Files hierarchy generation/index sync.                   |
| `app/api/admin/files/initialize/route.ts`                                                    | Study hierarchy initialization/index sync.                     |
| `app/api/admin/files/upload/route.ts`                                                        | Validated admin upload.                                        |
| `app/api/admin/files/[fileId]/route.ts`                                                      | Authorized file rename/move/deletion.                          |
| `app/api/admin/files/[fileId]/content/route.ts`                                              | Authorized content streaming/preview.                          |

### Feature components

| File                                                       | Responsibility                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `components/admin/ExportButton.tsx`                        | Reusable authenticated export trigger.                                |
| `components/admin/accounts/AccountsTable.tsx`              | Account table, role/grant editor, and deletion UI.                    |
| `components/admin/dashboard/EmploymentPieChart.tsx`        | Employment-status chart.                                              |
| `components/admin/dashboard/RecentResponses.tsx`           | Recent response dashboard list.                                       |
| `components/admin/files/DriveFileBrowser.tsx`              | Indexed Drive browsing, preview, upload, move, rename, and delete UI. |
| `components/admin/responses/ManualResponseEditor.tsx`      | Manual response editor wrapper.                                       |
| `components/admin/responses/ManualResponseEntry.tsx`       | Full manual-entry draft/import workflow.                              |
| `components/admin/responses/ManualResponseModal.tsx`       | Modal entry/resume launcher.                                          |
| `components/admin/studies/StudyScheduler.tsx`              | Study creation, lifecycle, archive, and deletion UI.                  |
| `components/auth/RoleChangeNotice.tsx`                     | One-time account role-change notice.                                  |
| `components/auth/SessionKeepAlive.tsx`                     | Periodic session refresh/expiry handling.                             |
| `components/auth/SignOutButton.tsx`                        | Sign-out action.                                                      |
| `components/forms/GraduateTracerForm.tsx`                  | Multi-step tracer form orchestration.                                 |
| `components/forms/FileUploadField.tsx`                     | Resumable evidence upload field.                                      |
| `components/forms/SelectField.tsx`                         | Labeled select/combobox field.                                        |
| `components/forms/StringListField.tsx`                     | Repeatable string-list editor.                                        |
| `components/forms/graduate-tracer/PersonalInfoSection.tsx` | Personal/contact fields.                                              |
| `components/forms/graduate-tracer/EducationSection.tsx`    | Education fields.                                                     |
| `components/forms/graduate-tracer/EmploymentSection.tsx`   | Employment fields and conditions.                                     |
| `components/forms/graduate-tracer/JobHistorySection.tsx`   | First-job/history fields and conditions.                              |
| `components/forms/graduate-tracer/shared.tsx`              | Shared tracer section types/layout helpers.                           |
| `components/layout/DashboardNavigation.tsx`                | Responsive role-aware desktop/mobile navigation.                      |
| `components/layout/ScrollContainer.tsx`                    | Styled scroll container.                                              |
| `components/responses/ReadOnlyResponseDetails.tsx`         | Structured response rendering.                                        |
| `components/responses/ResponseTable.tsx`                   | Responsive response data table and actions.                           |
| `components/responses/ResponseWorkspace.tsx`               | Alumni/staff view/edit/save/submit workspace.                         |
| `components/settings/ColorThemePreference.tsx`             | Blue/green/fuchsia/gray local palette setting.                        |
| `components/settings/AuditLogSection.tsx`                  | Searchable, filterable, paginated admin activity log.                 |
| `components/settings/InfoAccordion.tsx`                    | Settings help/info disclosure.                                        |
| `components/settings/MotionPreference.tsx`                 | Local reduced-motion provider/control.                                |
| `components/settings/SettingsPage.tsx`                     | Shared role-aware settings page.                                      |

### UI primitives

| File                                    | Responsibility                                       |
| --------------------------------------- | ---------------------------------------------------- |
| `components/ui/button-variants.ts`      | Server-safe CVA button variant/size definitions.     |
| `components/ui/button.tsx`              | Base UI button plus full-hitbox icon interaction.    |
| `components/ui/card.tsx`                | Card primitives.                                     |
| `components/ui/chart.tsx`               | Recharts styling/context helpers.                    |
| `components/ui/checkbox.tsx`            | Accessible checkbox primitive.                       |
| `components/ui/combobox.tsx`            | Accessible searchable selection primitive.           |
| `components/ui/ConfirmationDialog.tsx`  | Typed confirmation phrase dialog.                    |
| `components/ui/copy-button.tsx`         | Clipboard action with feedback.                      |
| `components/ui/ErrorState.tsx`          | Shared recoverable error presentation.               |
| `components/ui/FormModal.tsx`           | Form-oriented modal composition.                     |
| `components/ui/icon-link.tsx`           | Link styled and animated like a button.              |
| `components/ui/icons.tsx`               | Central icon mapper and interaction context.         |
| `components/ui/input.tsx`               | Shared recessed input primitive.                     |
| `components/ui/LoadingState.tsx`        | Shared loading presentation.                         |
| `components/ui/Modal.tsx`               | Accessible animated dialog/sheet and scroll locking. |
| `components/ui/ProfileAvatar.tsx`       | Profile image/fallback avatar.                       |
| `components/ui/search-input.tsx`        | Debounced-search input presentation.                 |
| `components/ui/sortable-table-head.tsx` | Sortable column-header control.                      |
| `components/ui/table.tsx`               | Table primitives.                                    |
| `components/ui/table-action-menu.tsx`   | Responsive row action menu.                          |
| `components/ui/table-content-state.tsx` | Loading/empty/error table rows.                      |
| `components/ui/ThemeToggle.tsx`         | System/light/dark local theme control.               |
| `components/ui/Toast.tsx`               | Toast provider and status notifications.             |

### Domain, infrastructure, and tests

| File                                                  | Responsibility                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `lib/admin/response-query.ts`                         | Parse/validate response filters, sorting, and pagination.         |
| `lib/api/client-errors.ts`                            | Friendly client fetch/JSON errors.                                |
| `lib/api/client-errors.test.ts`                       | Client-error behavior tests.                                      |
| `lib/api/form-response-documents.ts`                  | Legacy/server document upload/delete orchestration.               |
| `lib/api/responses.ts`                                | Consistent success/failure JSON helpers.                          |
| `lib/auth/constants.ts`                               | Session cookie name/options.                                      |
| `lib/auth/current-user.ts`                            | Cached current-user lookup.                                       |
| `lib/auth/index.ts`                                   | Auth public exports.                                              |
| `lib/auth/provider.ts`                                | Select the current auth-provider adapter.                         |
| `lib/auth/providers/supabase.ts`                      | Supabase Google identity linking and sessions.                    |
| `lib/auth/require-user.ts`                            | Page/API authentication and role guards.                          |
| `lib/auth/roles.ts`                                   | Role, program-scope, and response authorization.                  |
| `lib/auth/roles.test.ts`                              | Role/scope authorization tests.                                   |
| `lib/auth/types.ts`                                   | Provider-neutral `AuthUser`/`AuthProvider` contracts.             |
| `lib/confirmation-code.ts`                            | Destructive-action confirmation phrase helpers.                   |
| `lib/exports/accounts.ts`                             | Account export row/query and CSV support.                         |
| `lib/exports/excel.ts`                                | Styled Excel workbook generation.                                 |
| `lib/exports/responses.ts`                            | Scoped response export rows and CSV support.                      |
| `lib/forms/account-role-change.ts`                    | Draft cleanup required by role changes.                           |
| `lib/forms/definitions/graduate-tracer.v1.json`       | Built-in published v1 form metadata/options.                      |
| `lib/forms/graduate-tracer-adapter.ts`                | Convert stored answer records to/from the survey model.           |
| `lib/forms/graduate-tracer-schema.ts`                 | Zod schemas and conditional domain rules.                         |
| `lib/forms/graduate-tracer-validation.ts`             | Step/full-form validation facade.                                 |
| `lib/forms/graduate-tracer-validation.test.ts`        | Conditional tracer validation tests.                              |
| `lib/forms/registry.ts`                               | Built-in form definition lookup.                                  |
| `lib/forms/response-document-lifecycle.ts`            | When response documents may change.                               |
| `lib/forms/response-document-lifecycle.test.ts`       | Document lifecycle tests.                                         |
| `lib/forms/response-organization-change.ts`           | Detect program/name changes requiring Drive reorganization.       |
| `lib/forms/response-organization-change.test.ts`      | Organization-change detection tests.                              |
| `lib/google/oauth.ts`                                 | Google OAuth client and Drive refresh-token settings.             |
| `lib/google-drive/admin-files.ts`                     | Admin Files ancestry authorization.                               |
| `lib/google-drive/browser.ts`                         | Indexed list/search and streamed content.                         |
| `lib/google-drive/client.ts`                          | Authenticated Google Drive client.                                |
| `lib/google-drive/direct-upload.ts`                   | Resumable upload creation/inspection.                             |
| `lib/google-drive/files.ts`                           | Low-level Drive upload/delete operations.                         |
| `lib/google-drive/folders.ts`                         | Idempotent managed-folder creation/lookup.                        |
| `lib/google-drive/initialize-hierarchy.ts`            | Study and Admin Files hierarchy creation.                         |
| `lib/google-drive/organization-lifecycle.ts`          | Retry/error lifecycle wrapper for organization.                   |
| `lib/google-drive/organization-lifecycle.test.ts`     | Organization lifecycle tests.                                     |
| `lib/google-drive/organize-response.ts`               | Move response evidence into the canonical hierarchy.              |
| `lib/google-drive/response-cleanup.ts`                | Response Drive cleanup.                                           |
| `lib/google-drive/response-folders.ts`                | Response, evidence, and staging folder resolution.                |
| `lib/google-drive/staged-upload-cleanup.ts`           | Expired/staged upload cleanup.                                    |
| `lib/google-drive/study-cleanup.ts`                   | Study hierarchy cleanup and safety checks.                        |
| `lib/google-drive/sync-index.ts`                      | Reconcile Drive metadata into PostgreSQL index.                   |
| `lib/hooks/use-debounced-value.ts`                    | Generic debounced value hook.                                     |
| `lib/hooks/use-navigation-warning.ts`                 | Warn on navigation with unsaved changes.                          |
| `lib/hooks/use-reduced-motion-preference.ts`          | Shared local motion preference store/hook.                        |
| `lib/programs/catalog.ts`                             | Canonical programs, organizations, folders, and grant validation. |
| `lib/repositories/accounts.repository.ts`             | Account CRUD/profile/access persistence.                          |
| `lib/repositories/admin-responses.repository.ts`      | Scoped admin response/dashboard queries.                          |
| `lib/repositories/audit.repository.ts`                | Security audit writes and filtered admin reads.                   |
| `lib/repositories/direct-drive-uploads.repository.ts` | Direct-upload session state transitions.                          |
| `lib/repositories/form-responses.repository.ts`       | Response/document/manual/deletion/organization persistence.       |
| `lib/repositories/forms.repository.ts`                | Active form, study context, and version queries.                  |
| `lib/repositories/google-drive-folders.repository.ts` | Managed-folder registry persistence.                              |
| `lib/repositories/google-drive-items.repository.ts`   | Drive index, search, and ancestry RPCs.                           |
| `lib/repositories/study-admin.repository.ts`          | Study listing, lifecycle, counts, and deletion RPC.               |
| `lib/security/csv.ts`                                 | Spreadsheet formula-injection protection.                         |
| `lib/security/rate-limit.ts`                          | In-memory fixed-window limiter.                                   |
| `lib/security/rate-limit-policy.ts`                   | Classify auth/export/mutation endpoints.                          |
| `lib/security/security.test.ts`                       | CSV, rate-limit, upload, and security tests.                      |
| `lib/security/uploads.ts`                             | Upload metadata/signature policy.                                 |
| `lib/server/env.ts`                                   | Required server environment accessor.                             |
| `lib/server/timeouts.ts`                              | External-service deadlines/wrapper.                               |
| `lib/supabase/errors.ts`                              | Supabase/JWT error classification.                                |
| `lib/supabase/fetch.ts`                               | Timeout-aware Supabase fetch implementation.                      |
| `lib/supabase/fetch.test.ts`                          | Supabase fetch retry/timeout tests.                               |
| `lib/supabase/server.ts`                              | Service-credential Supabase client.                               |
| `lib/supabase/session.ts`                             | Cookie-aware Supabase SSR session client.                         |
| `lib/surveys/defaults.ts`                             | Complete default tracer answer object.                            |
| `lib/utils.ts`                                        | Tailwind-aware class-name merge helper.                           |

### Shared types

| File                       | Responsibility                                             |
| -------------------------- | ---------------------------------------------------------- |
| `types/audit.ts`           | Sanitized activity-log event contract.                     |
| `types/forms.ts`           | Forms, studies, response summaries, statuses, and filters. |
| `types/google-drive.ts`    | File browser item and breadcrumb contracts.                |
| `types/index.ts`           | Shared type barrel.                                        |
| `types/roles.ts`           | Role constants and coordinator grant contracts.            |
| `types/survey.ts`          | Full graduate tracer answer model and option unions.       |
| `types/survey-document.ts` | Evidence document metadata/type.                           |

### Scripts and Supabase

| File                                                                                   | Responsibility                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `scripts/migrate-appwrite-accounts.ts`                                                 | Dry-run-by-default legacy Appwrite-to-`auth_accounts` importer.                                  |
| `supabase/.gitignore`                                                                  | Ignores local Supabase CLI branches/cache.                                                       |
| `supabase/config.toml`                                                                 | Local Supabase services, ports, database/auth, and disabled seed phase.                          |
| `supabase/migrations/20260713000953_create_tracer_schema.sql`                          | Original tracer schema and shared updated-at function; legacy tables are later migrated/dropped. |
| `supabase/migrations/20260723000000_add_versioned_studies.sql`                         | Versioned definitions, studies, responses, views, constraints, and triggers.                     |
| `supabase/migrations/20260723010000_add_manual_form_responses.sql`                     | Manual/admin-import response ownership.                                                          |
| `supabase/migrations/20260723020000_seed_graduate_tracer_v1.sql`                       | Seed built-in form/version and initial study data.                                               |
| `supabase/migrations/20260723030000_grant_study_schema_access.sql`                     | Explicit service-role grants.                                                                    |
| `supabase/migrations/20260723040000_add_form_response_documents.sql`                   | Versioned-response document metadata.                                                            |
| `supabase/migrations/20260723050000_allow_unnamed_manual_responses.sql`                | Relax manual respondent-name identity constraint.                                                |
| `supabase/migrations/20260723060000_replace_legacy_surveys.sql`                        | Migrate/drop legacy survey tables and remove external reference.                                 |
| `supabase/migrations/20260724000000_add_google_drive_folder_registry.sql`              | Concurrent-safe Drive folder registry.                                                           |
| `supabase/migrations/20260724010000_optimize_admin_response_queries.sql`               | Search/generated text, indexes, and response summary view.                                       |
| `supabase/migrations/20260724020000_add_manual_import_lifecycle.sql`                   | Retryable import/upload-key lifecycle.                                                           |
| `supabase/migrations/20260724030000_add_response_deletion_lifecycle.sql`               | Retryable deletion state.                                                                        |
| `supabase/migrations/20260724040000_enable_row_level_security.sql`                     | RLS and browser-role revocation.                                                                 |
| `supabase/migrations/20260725000000_add_google_drive_item_index.sql`                   | Searchable Drive item mirror.                                                                    |
| `supabase/migrations/20260726000000_secure_documents_and_track_drive_organization.sql` | Evidence guards and Drive organization state.                                                    |
| `supabase/migrations/20260727000000_add_manual_study_lifecycle.sql`                    | Explicit open/closed study lifecycle.                                                            |
| `supabase/migrations/20260728000000_repair_response_document_upload_status.sql`        | Idempotent upload-status/trigger repair.                                                         |
| `supabase/migrations/20260729000000_enforce_single_manual_draft_per_study.sql`         | One manual draft per staff/study.                                                                |
| `supabase/migrations/20260730000000_add_security_audit_events.sql`                     | Server-only security audit log.                                                                  |
| `supabase/migrations/20260731000000_add_direct_drive_upload_sessions.sql`              | Resumable direct-to-Drive upload sessions.                                                       |
| `supabase/migrations/20260801000000_add_direct_upload_browser_origin.sql`              | Bind direct uploads to browser origin.                                                           |
| `supabase/migrations/20260802000000_separate_response_content_timestamp.sql`           | Separate answer concurrency timestamp from operational updates.                                  |
| `supabase/migrations/20260803000000_add_provider_neutral_auth_accounts.sql`            | Stable provider-neutral account table.                                                           |
| `supabase/migrations/20260804000000_optimize_response_write_path.sql`                  | Study-context view and atomic alumni response RPC.                                               |
| `supabase/migrations/20260805000000_optimize_admin_reads.sql`                          | Study summaries and Drive ancestry RPCs.                                                         |
| `supabase/migrations/20260806000000_add_response_display_name_sort.sql`                | Final response summary/display-name sorting view.                                                |
| `supabase/migrations/20260807000000_delete_study_periods.sql`                          | Transactional study deletion RPC.                                                                |
| `supabase/migrations/20260808000000_add_flexible_coordinator_access.sql`               | Coordinator role, scope grants, and access replacement RPC.                                      |
| `supabase/migrations/20260809000000_harden_coordinator_access.sql`                     | Validate/harden atomic coordinator access replacement.                                           |
| `supabase/migrations/20260810000000_expand_security_audit_events.sql`                  | Actor snapshots, search indexes, and append-only audit enforcement.                              |

When files are added, renamed, or retired, update this inventory in the same change.
