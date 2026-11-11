# Placement Tracer System – Complete Tutorial & Handoff Guide

**Version:** 1.0 | **Last Updated:** 2026-08-26

This is your comprehensive guide to the Placement Tracer System. It covers the project mission, technology stack, architecture, development workflow, and deployment practices.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [What This System Does](#what-this-system-does)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Database & Data Model](#database--data-model)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Workflows](#key-workflows)
9. [API Routes](#api-routes)
10. [Component Structure](#component-structure)
11. [Development Practices](#development-practices)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is the Placement Tracer System?

The **Placement Tracer System** is a production web application that manages graduate tracer studies and alumni response collection for the **Partido State University (ParSU) Placement Unit**.

It is built with **Next.js 16**, **React 19**, and **TypeScript**, backed by **Supabase** (PostgreSQL + Auth) and **Google Drive** for file storage.

### Key Capabilities

- ✅ **Google OAuth Authentication** – Only ParSU-domain accounts (@parsu.edu.ph)
- ✅ **Role-Based Access Control** – Admin, Coordinator, Alumni roles with fine-grained permissions
- ✅ **Tracer Form Management** – Publish versioned forms, manage study periods
- ✅ **Response Lifecycle** – Alumni save drafts, submit, update, and delete responses
- ✅ **File Management** – Upload evidence to Google Drive with resumable uploads
- ✅ **Data Export** – Excel-based reports with anti-injection protection
- ✅ **Audit Logging** – Track all sensitive operations and role changes
- ✅ **Multi-Campus Support** – Coordinator access by campus, college, and program

---

## What This System Does

### User Journeys by Role

#### 👤 Alumni User

1. Sign in with their ParSU Google account
2. Browse open tracer study forms
3. Save draft responses
4. Upload supporting evidence (certificates, photos)
5. Submit final response or update open response
6. Delete own response before deadline

#### 👔 Coordinator (Staff)

1. View responses within their assigned programs/colleges
2. Search, filter, and inspect response data
3. Enter manual responses on behalf of respondents
4. Import batch response data from CSV/Excel
5. Organize uploaded files in Google Drive
6. Export response data as styled Excel workbooks
7. Cannot create/modify forms or manage accounts

#### 🔐 Administrator

1. Manage user accounts and role assignments
2. Create and publish tracer forms
3. Create/open/close study periods
4. View all data across all programs
5. Export all account and response data
6. Browse and organize Google Drive Admin Files
7. View comprehensive audit logs

### Core Business Flows

**Study Administration Flow:**

```
Admin creates study → Initializes Drive hierarchy → Manually opens/closes
```

**Alumni Response Flow:**

```
Alumni opens form → Saves draft → Uploads documents → Submits response
                                                    ↓
                                            Coordinator reviews → May update
```

**Manual Response Flow:**

```
Coordinator creates draft → Imports evidence → Completes import → Organizes Drive
```

**Export Flow:**

```
User selects criteria → Server authorizes → Exports styled Excel → Audit event logged
```

---

## Technology Stack

| Category          | Technology                | Version        | Purpose                     |
| ----------------- | ------------------------- | -------------- | --------------------------- |
| **Frontend**      | React                     | 19.2.4         | UI library                  |
| **Framework**     | Next.js                   | 16.2.9         | Full-stack web framework    |
| **Language**      | TypeScript                | 5              | Type-safe development       |
| **Styling**       | Tailwind CSS              | 4              | Utility-first CSS           |
| **Forms**         | React Hook Form + Zod     | 7.82.0 + 4.4.3 | Form state & validation     |
| **UI Components** | shadcn + Base UI          | 4.15.0 + 1.6.0 | Pre-built component library |
| **Database**      | Supabase PostgreSQL       | —              | Relational database         |
| **Auth**          | Supabase Auth             | 0.12.0         | Authentication + OAuth      |
| **File Storage**  | Google Drive API          | 173.0.0        | Document storage & uploads  |
| **Data Export**   | ExcelJS                   | 4.4.0          | Excel workbook generation   |
| **Charts**        | Recharts                  | 3.8.0          | Data visualization          |
| **Animation**     | Motion                    | 12.42.2        | Smooth transitions          |
| **Testing**       | Node built-in test runner | —              | Unit & integration tests    |
| **Linting**       | ESLint                    | 9              | Code quality                |
| **Runtime**       | Node.js                   | ≥20.9          | JavaScript runtime          |

### System Requirements

- **Node.js:** 20.9 or newer
- **npm:** Latest version
- **Git:** For version control
- **Environment:** Linux, macOS, or Windows

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser / Client                      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ↓
┌──────────────────────────────────────────────────────────────┐
│                     proxy.ts (Middleware)                    │
│  • Optimistic cookie check  • Origin guards  • Rate limits   │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────┐
│            Next.js App Router (Pages & API Routes)           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Pages (Server Components + Client Components)         │  │
│  │  • (auth) – Sign-in flow                               │  │
│  │  • (protected) – Dashboards, forms, responses          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Routes (Route Handlers)                           │  │
│  │  • /api/admin/* – Admin operations                     │  │
│  │  • /api/forms/* – Form data                            │  │
│  │  • /api/form-responses/* – Response operations         │  │
│  │  • /api/studies/* – Study management                   │  │
│  │  • /api/auth/* – Authentication callbacks              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  lib/ (Application Logic)                              │  │
│  │  • lib/auth – User & role verification                 │  │
│  │  • lib/repositories – Supabase queries                 │  │
│  │  • lib/forms – Form validation & lifecycle             │  │
│  │  • lib/google-drive – Drive integration                │  │
│  │  • lib/exports – Excel/CSV generation                  │  │
│  │  • lib/programs – Org structure & catalog              │  │
│  │  • lib/surveys – Study & form management               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  components/ (Reusable UI)                             │  │
│  │  • components/ui/* – Primitives (Button, Input, etc)   │  │
│  │  • components/forms/* – Form-specific components       │  │
│  │  • components/admin/* – Admin-only UI                  │  │
│  │  • components/layout/* – Navigation & structure        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ↓                              ↓
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Supabase PostgreSQL     │   │    Google Drive API          │
│  • Identity tables       │   │    • File storage            │
│  • Response data         │   │    • Folder hierarchy        │
│  • Audit logs            │   │    • Resumable uploads       │
│  • Study metadata        │   │    • File organization       │
│  • Google Drive index    │   │    • Admin file browser      │
└──────────────────────────┘   └──────────────────────────────┘
```

### Key Design Principles

1. **Authorization Boundary:** Every protected page and API handler re-verifies the current user. `proxy.ts` is an optimistic edge guard, not the security boundary.

2. **Source of Truth:** All database changes are append-only SQL migrations. Never create tables outside migrations.

3. **Separation of Concerns:**
   - `app/` – Routing and page composition only
   - `components/` – Reusable UI and form primitives
   - `lib/` – All domain and infrastructure logic
   - `types/` – Shared type definitions

4. **Org Structure:** The canonical campus/college/program mapping lives in `lib/programs/catalog.ts`. Update catalog AND validation together.

5. **Google Drive Management:** Only the configured `GOOGLE_DRIVE_ROOT_FOLDER_ID` is managed. Folder IDs are coordinated in `google_drive_folders` table; do not manually move managed folders.

---

## Getting Started

### Prerequisites

- Node.js 20.9+ and npm installed
- A Supabase project with PostgreSQL database
- A Google Cloud project with Drive API enabled
- Service account credentials for Google Drive (JSON key)
- Supabase service role key

### 1. Clone & Install

```bash
git clone https://github.com/your-org/tracer-system.git
cd tracer-system
npm ci  # Use npm ci instead of npm install for reproducible builds
```

### 2. Environment Setup

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (from Google Cloud Console)
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# Google Drive API
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-drive-folder-id
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Optional: Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
```

**Important:**

- `NEXT_PUBLIC_*` variables are exposed to the browser
- Service keys like `SUPABASE_SERVICE_ROLE_KEY` must remain server-only
- Never commit `.env.local` to version control

### 3. Database Setup

```bash
# Connect to Supabase and run migrations
npx supabase migration list  # Check migration status
npx supabase db push        # Apply pending migrations
```

### 4. Development Server

```bash
npm run dev
# Starts on http://localhost:3000
```

### 5. Testing

```bash
npm test                    # Run all tests
npm run test:forms         # Run form tests specifically
npm run lint               # Check code quality
npm run format             # Format code with Prettier
```

### 6. Build & Production

```bash
npm run build              # Optimize for production
npm start                  # Start production server
```

---

## Database & Data Model

### Schema Overview

The database is organized into logical domains:

#### **auth_accounts** (Identity)

```
id (UUID) → User account identifier
provider_user_id → Google OAuth ID
email → Normalized email
role → 'admin' | 'coordinator' | 'alumni'
coordinator_scope_grants → JSONB array of org grants
created_at, updated_at
```

#### **studies** (Study Management)

```
id (UUID)
form_version_id → Reference to published form
academic_year → e.g., "2025-2026"
study_title → Human-readable name
status → 'draft' | 'open' | 'closed' | 'archived'
opening_date, closing_date
created_by_admin_id
```

#### **form_responses** (Response Data)

```
id (UUID)
study_id → Which study
user_id → Alumni who responded (or NULL for imports)
entered_by_user_id → Admin/coordinator who created it
source → 'alumni' | 'admin_import'
status → 'draft' | 'submitted'
answers → JSONB object with form responses
created_at, updated_at, submitted_at
```

#### **form_response_documents** (Uploaded Files)

```
id (UUID)
response_id → Which response
google_drive_file_id → Actual Drive file
file_name, file_size
upload_status → 'pending' | 'completed' | 'failed'
created_at
```

#### **google_drive_folders** (Drive Structure)

```
id (UUID)
folder_name → Display name
parent_google_drive_folder_id → Drive parent ID
google_folder_id → Actual Drive folder ID
purpose → 'upload_staging' | 'study' | 'admin_files' | etc.
study_id → If tied to a study
```

#### **security_audit_events** (Compliance)

```
id (UUID)
admin_id → Who performed action
event_type → 'role_change' | 'export' | 'account_create' | etc.
resource_type → 'user' | 'study' | 'response'
resource_id
details → JSONB with context
created_at
```

### Key Relationships

```
study
  ├── has many form_responses
  │   ├── has many form_response_documents
  │   └── linked to upload status tracking
  └── linked to google_drive_folders
      └── hierarchy: upload staging → campus/college/program/respondent

auth_account
  ├── has role (admin/coordinator/alumni)
  ├── has coordinator_scope_grants (JSONB array)
  └── tracks in security_audit_events

form_version
  ├── has many forms (form_definition)
  └── linked to studies
```

### Row-Level Security (RLS)

The database enforces security at the SQL level:

- Admins see all data
- Coordinators see only their granted programs' data
- Alumni see only their own responses
- All queries verify user role before returning data

**Important:** Never bypass RLS in application code. Always query through authorized repositories.

---

## Authentication & Authorization

### Authentication Flow

```
1. User visits /signin
2. Clicks "Sign in with Google"
3. Redirected to Google OAuth consent screen
4. Google redirects back with auth code
5. /api/auth/callback processes code
6. Supabase Auth issues JWT (stored in HTTP-only cookie)
7. User verified on every request via middleware
8. application account created (first time) or linked
```

### Authorization Model

#### Roles

| Role            | Description          | Capabilities                                 |
| --------------- | -------------------- | -------------------------------------------- |
| **admin**       | Administrators       | Full access; manage accounts, studies, forms |
| **coordinator** | Staff members        | View/manage responses in granted programs    |
| **alumni**      | Graduate respondents | Complete own responses; view own data        |

#### Coordinator Scope Grants

Coordinators have fine-grained access via `coordinator_scope_grants` (stored as JSONB array):

```json
[
  { "type": "campus", "value": "Manila" },
  { "type": "college", "value": "CIT" },
  { "type": "program", "value": "cs_bs" }
]
```

The union of all granted programs determines what data they see.

#### Program Catalog

The canonical organization structure is in `lib/programs/catalog.ts`:

```typescript
const PROGRAMS = {
  cs_bs: { campus: "Manila", college: "CIT", name: "BS Computer Science" },
  it_bs: {
    campus: "Manila",
    college: "CIT",
    name: "BS Information Technology",
  },
  // ... more programs
};
```

Update this file when your organization structure changes.

### Key Auth Utilities

```typescript
// lib/auth/current-user.ts
getCurrentUser() → returns { id, email, role, coordinatorGrants, ... }

// lib/auth/roles.ts
getRole(user) → 'admin' | 'coordinator' | 'alumni'
isAdmin(user) → boolean
isCoordinator(user) → boolean
canAccessProgram(user, program) → boolean
canManageResponse(user, response) → boolean
```

### Protection Patterns

Every protected page and API route must:

```typescript
// Pages (Server Components)
const user = await getCurrentUser();
if (!user) redirect("/signin");
if (user.role !== ROLES.ADMIN) throw new Error("Forbidden");

// API Routes
const user = await getCurrentUser();
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
if (!isAdmin(user))
  return Response.json({ error: "Forbidden" }, { status: 403 });

// Check program access
const allowedPrograms = getAllowedProgramValues(user);
if (!allowedPrograms?.includes(programId)) {
  return Response.json({ error: "Access denied" }, { status: 403 });
}
```

---

## Key Workflows

### Workflow 1: Admin Creates a Study

```
1. Admin navigates to Studies Admin page
2. Selects a published form version (e.g., "Graduate Tracer v1")
3. Enters study metadata: academic year, title, dates
4. Clicks "Create Study"
   → Creates study record with status='draft'
   → Initializes Google Drive folder structure
   → Sets up upload staging area
5. Manually opens study (changes status to 'open')
   → Email notifications sent to alumni
6. Alumni can now submit responses
7. Admin manually closes study (status='closed')
   → No new responses accepted
8. Later archives or deletes study
```

**Key Files:**

- `app/(protected)/admin/studies/` – Admin pages
- `app/api/admin/studies/route.ts` – Study CRUD
- `lib/surveys/` – Study/form logic
- `lib/google-drive/` – Drive initialization

### Workflow 2: Alumni Submits Response

```
1. Alumni visits dashboard, clicks on open study
2. Loads form with initial data (cached from form_version)
3. Fills out questions, uploads evidence files
   → Files uploaded directly to Google Drive (resumable)
   → Upload status tracked in form_response_documents
4. Saves draft (without validation)
   → Creates form_response with status='draft'
5. Later returns and updates draft
   → Can view previous uploads
   → Can delete unwanted documents
6. Clicks "Submit" (triggers validation)
   → Zod validates answers against form schema
   → If valid, sets status='submitted'
   → Cannot edit after submission (if form immutable)
7. If study reopened, can update response
8. Can delete their response anytime (before deadline)
```

**Key Files:**

- `app/(protected)/page.tsx` – Alumni dashboard
- `components/forms/GraduateTracerForm.tsx` – Form UI
- `components/forms/FileUploadField.tsx` – File upload
- `app/api/form-responses/route.ts` – Response CRUD
- `lib/forms/` – Form validation & lifecycle

### Workflow 3: Coordinator Reviews Responses

```
1. Coordinator logs in, navigates to "Responses"
2. Sees only responses from their granted programs
3. Filters by:
   → Study period
   → Program
   → Response status
   → Search by respondent name/email
4. Clicks response to view detailed form answers
5. Can:
   → View all uploaded documents
   → Add notes (stored in response)
   → Edit response data (with audit trail)
   → Move files in Drive
   → Delete response (with soft delete first)
6. Exports subset to Excel
   → Server filters by permission
   → Audit event logged
   → Returns styled Excel file with anti-injection
```

**Key Files:**

- `app/(protected)/admin/responses/` – Response list/detail
- `components/responses/ResponseTable.tsx` – Data table
- `components/responses/ResponseWorkspace.tsx` – Detail view
- `app/api/admin/responses/route.ts` – Response queries
- `lib/admin/response-query.ts` – Filtered queries

### Workflow 4: Manual Response Import

```
1. Coordinator navigates to "Manual Responses"
2. Creates new manual response
   → Selects study and program (or leaves blank)
   → Creates response with status='draft'
   → Only this coordinator can edit
3. Imports respondent data from CSV/Excel
   → Extracts answers, validates against form
   → Uploads evidence attachments
   → Tracks import status (pending/completed/failed)
4. Reviews imported data
   → Can fix validation errors
   → Can re-upload documents
5. Clicks "Complete Import"
   → Triggers background organization in Google Drive
   → Moves documents to study hierarchy
   → Updates import status
6. If organization fails, can retry
```

**Key Files:**

- `app/api/admin/responses/manual-draft/route.ts`
- `app/api/admin/responses/[id]/import/route.ts`
- `app/api/admin/responses/[id]/organize/route.ts`
- `lib/repositories/form-responses.ts`

### Workflow 5: Export Response Data

```
1. Coordinator/Admin clicks "Export"
2. Selects filter criteria:
   → Date range
   → Program (if coordinator, only their programs)
   → Study period
3. Clicks "Generate Excel"
   → Server authorizes request
   → Queries filtered responses
   → Formats as styled Excel workbook
   → Protects cell values from formula injection
   → Creates audit log entry
4. File downloaded to browser
5. Audit trail recorded for compliance
```

**Key Files:**

- `app/api/admin/responses/export/route.ts`
- `lib/exports/responses.ts` – Excel formatting
- `lib/exports/excel.ts` – Protection & styling
- `lib/security/` – Audit logging

---

## API Routes

### Overview of API Structure

```
/api/
├── /admin/
│   ├── /accounts/               # User management (admin only)
│   ├── /audit-events/           # Compliance logging (admin only)
│   ├── /files/                  # Google Drive file browser (admin)
│   ├── /responses/              # Response CRUD (admin/coordinator)
│   └── /studies/                # Study management (admin only)
├── /auth/
│   ├── /callback                # Google OAuth callback
│   └── /signout                 # Session cleanup
├── /forms/                      # Form definitions & versions
├── /form-responses/             # Response submission & queries
└── /studies/                    # Study browsing & metadata
```

### Key API Endpoints

#### Authentication

```
POST /api/auth/callback
  • Google OAuth callback handler
  • Creates or links auth_account
  • Sets secure HTTP-only cookie
```

#### Studies (Admin)

```
GET /api/admin/studies
  • List all studies
  • Returns: [{ id, form_version_id, academic_year, title, status, ... }]

POST /api/admin/studies
  • Create study
  • Body: { form_version_id, academic_year, study_title, opening_date, closing_date }
  • Returns: { id, ... }

GET /api/admin/studies/[studyId]
  • Get single study detail

PATCH /api/admin/studies/[studyId]
  • Update study (metadata, dates)

POST /api/admin/studies/[studyId]/status
  • Open/close/archive study
  • Body: { status: 'open' | 'closed' | 'archived' }

DELETE /api/admin/studies/[studyId]
  • Archive or soft-delete study
  • Cleans up Google Drive hierarchy
```

#### Responses (Admin/Coordinator)

```
GET /api/admin/responses
  • List responses with filters
  • Query params: ?studyId=X&program=Y&search=Z
  • Authorization: only their programs (coordinator)

GET /api/admin/responses/[id]
  • Get single response with all fields and documents

PATCH /api/admin/responses/[id]
  • Update response data or status
  • Body: { answers: {...}, status: '...' }

POST /api/admin/responses/[id]/import
  • Import batch data and evidence
  • Body: form-data with CSV + documents

POST /api/admin/responses/[id]/organize
  • Trigger background Drive organization
  • Moves documents to study hierarchy

DELETE /api/admin/responses/[id]
  • Soft-delete response (mark as deleted, can retry)

GET /api/admin/responses/export
  • Export filtered responses as Excel
  • Query params: ?studyId=X&program=Y
  • Authorization: filters by role/scope
  • Returns: .xlsx file
```

#### Form Responses (Alumni)

```
GET /api/form-responses?studyId=X
  • Get current user's response for a study (if exists)

POST /api/form-responses
  • Create or update response
  • Body: { studyId, answers: {...}, status: 'draft' | 'submitted' }
  • Validation: Zod schema checks answers

DELETE /api/form-responses/[id]
  • Delete own response
  • Only alumni who created it
```

#### Files (Admin)

```
GET /api/admin/files
  • List files in Drive (paginated)
  • Query: ?folderId=X&search=Y

POST /api/admin/files/upload
  • Direct file upload to Drive
  • Body: form-data
  • Returns: { fileId, ... }

POST /api/admin/files/initialize
  • Initialize Drive structure for new study
  • Body: { studyId }

GET /api/admin/files/[fileId]/content
  • Serve file content (browser iframe-safe)
  • CSP headers: frame-ancestors 'self'
```

#### Accounts (Admin)

```
GET /api/admin/accounts
  • List all user accounts
  • Returns: [{ id, email, role, coordinatorGrants, ... }]

POST /api/admin/accounts
  • Create account manually
  • Body: { email, role, coordinatorGrants }

PATCH /api/admin/accounts/[id]
  • Update account (role, grants)
  • Logs audit event

DELETE /api/admin/accounts/[id]
  • Deactivate account

GET /api/admin/accounts/export
  • Export all accounts as Excel
```

#### Audit Events (Admin)

```
GET /api/admin/audit-events
  • List security events
  • Query: ?type=X&startDate=Y

GET /api/admin/audit-events/export
  • Export audit log as Excel
```

### API Error Handling

All API routes return consistent error responses:

```json
{
  "error": "Descriptive message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

HTTP Status Codes:

- `200 OK` – Successful
- `201 Created` – Resource created
- `400 Bad Request` – Invalid input (Zod validation failed)
- `401 Unauthorized` – Missing authentication
- `403 Forbidden` – Insufficient permissions
- `404 Not Found` – Resource not found
- `409 Conflict` – Business rule violation
- `500 Internal Server Error` – Unexpected error

### Authentication in API Routes

```typescript
import { getCurrentUser } from "@/lib/auth";
import { requireRole } from "@/lib/auth/roles";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  try {
    requireRole(user, [ROLES.ADMIN]);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Continue with logic...
}
```

---

## Component Structure

### Directory Organization

```
components/
├── ui/                          # Primitive components
│   ├── button.tsx               # <Button> with variants
│   ├── input.tsx                # <Input> with validation
│   ├── table.tsx                # <Table> for data display
│   ├── Modal.tsx                # Dialog/modal container
│   ├── ConfirmationDialog.tsx    # Confirm action pattern
│   ├── Toast.tsx                # Toast notifications
│   ├── ErrorState.tsx           # Error display pattern
│   ├── LoadingState.tsx         # Loading skeleton pattern
│   ├── button-variants.ts       # Button semantic variants
│   ├── icons.tsx                # Application icon mapping
│   └── ...                      # Other primitives
├── forms/                       # Form-specific components
│   ├── GraduateTracerForm.tsx    # Main tracer form
│   ├── FileUploadField.tsx       # File upload input
│   ├── StringListField.tsx       # Multi-value input
│   ├── SelectField.tsx          # Dropdown input
│   ├── graduate-tracer/         # Form-specific sub-components
│   └── ...
├── auth/                        # Authentication UI
│   ├── SessionKeepAlive.tsx      # Token refresh
│   ├── RoleChangeNotice.tsx      # Alert on role change
│   └── SignOutButton.tsx         # Logout action
├── admin/                       # Admin-only components
│   ├── ExportButton.tsx          # Export trigger
│   ├── dashboard/               # Admin dashboard
│   ├── accounts/                # Account management UI
│   ├── responses/               # Response management UI
│   ├── studies/                 # Study management UI
│   └── files/                   # Drive file browser
├── responses/                   # Response viewing
│   ├── ResponseTable.tsx         # Tabular view
│   ├── ResponseWorkspace.tsx     # Detailed view
│   └── ReadOnlyResponseDetails.tsx # Display-only version
├── layout/                      # Layout structure
│   ├── DashboardNavigation.tsx   # Top/side nav
│   └── ScrollContainer.tsx       # Scroll management
└── settings/                    # User settings
    ├── SettingsPage.tsx         # Settings container
    ├── ColorThemePreference.tsx  # Theme selector
    ├── MotionPreference.tsx      # Reduced motion toggle
    └── ...
```

### Key Component Patterns

#### Form Components

```typescript
// components/forms/GraduateTracerForm.tsx
export function GraduateTracerForm({
  initialData,
  studyId,
  isSubmitted,
  onSubmit
}) {
  const form = useForm<FormData>({
    resolver: zodResolver(SCHEMA),
    defaultValues: initialData
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Fields */}
      <FileUploadField name="documents" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

#### Data Table Components

```typescript
// components/responses/ResponseTable.tsx
export function ResponseTable({ responses, onSelect }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Respondent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead sortable column="submitted_at">
            Submitted
          </TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {responses.map(response => (
          <TableRow key={response.id} onClick={() => onSelect(response)}>
            <TableCell>{response.answersDisplay.name}</TableCell>
            {/* More cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### Dialog/Confirmation Pattern

```typescript
// Trigger export
<ConfirmationDialog
  title="Export Responses"
  description="This will generate an Excel file with all matching responses."
  actionLabel="Export"
  onConfirm={async () => {
    const blob = await exportResponses(filters);
    downloadBlob(blob, "responses.xlsx");
  }}
/>
```

### Design System Usage

All components should use semantic tokens:

```tsx
// ✅ Good – semantic tokens
<div className="bg-card border-border text-foreground">
  <Button variant="primary">Submit</Button>
</div>

// ❌ Avoid – hardcoded colors
<div className="bg-blue-500 text-white">
  <button className="bg-red-600">Submit</button>
</div>
```

---

## Development Practices

### Code Organization

1. **One file per component** – Unless a component is very small (<50 lines)
2. **Exports vs defaults** – Use named exports: `export function ComponentName() {}`
3. **Type definitions** – Colocate types with components or in `types/`
4. **Hooks** – Reusable hooks in `lib/hooks/`

### Naming Conventions

- **Components:** PascalCase (`UserCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types:** PascalCase (`UserResponse`)
- **Database tables:** snake_case (`form_responses`)

### TypeScript Best Practices

```typescript
// Use strict typing
type User = {
  id: string;
  email: string;
  role: "admin" | "coordinator" | "alumni";
};

// Use exhaustive checks
const handleRole = (role: User["role"]) => {
  switch (role) {
    case "admin":
      return <AdminPanel />;
    case "coordinator":
      return <CoordinatorPanel />;
    case "alumni":
      return <AlumniPanel />;
    // TypeScript error if new role not handled
  }
};

// Use Zod for validation
const ResponseSchema = z.object({
  studyId: z.string().uuid(),
  answers: z.record(z.unknown()),
  status: z.enum(["draft", "submitted"]),
});
```

### Testing

Run tests with:

```bash
npm test                    # All tests
npm run test:forms         # Specific suite
```

Example test:

```typescript
// lib/forms/validation.test.ts
import { test } from "node:test";
import assert from "node:assert";
import { validateFormAnswers } from "./validation";

test("validates required fields", async () => {
  const result = await validateFormAnswers(
    { name: "John", email: "" },
    FORM_SCHEMA,
  );
  assert.equal(result.success, false);
  assert(result.errors.email);
});
```

### Error Handling

```typescript
// API routes
try {
  const result = await operation();
  return Response.json(result);
} catch (error) {
  if (error instanceof ValidationError) {
    return Response.json(
      { error: "Validation failed", details: error.details },
      { status: 400 },
    );
  }
  console.error("Unexpected error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

### Form Validation Patterns

```typescript
// Define schema once
const RESPONSE_SCHEMA = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email(),
  employment_status: z.enum([
    "employed",
    "unemployed",
    "pursuing_further_study",
  ]),
  documents: z.array(z.instanceof(File)).optional(),
});

// Use in form
const form = useForm({
  resolver: zodResolver(RESPONSE_SCHEMA),
});

// Use in API
const validated = RESPONSE_SCHEMA.parse(req.body);
```

### Async Data Fetching Patterns

```typescript
// Server components (can use async)
export default async function ResponsePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const response = await getResponse(params.id);

  if (!response) notFound();

  return <ResponseDetail response={response} />;
}

// Client-side queries
import { useEffect, useState } from "react";

export function ResponseList() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/form-responses")
      .then(r => r.json())
      .then(setResponses)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!responses.length) return <ErrorState message="No responses" />;

  return <ResponseTable responses={responses} />;
}
```

### Environment-Specific Code

```typescript
// Use Next.js environment variables correctly
const isDev = process.env.NODE_ENV === "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser-safe
console.log(process.env.NEXT_PUBLIC_APP_NAME); // ✅ OK
console.log(process.env.SECRET_KEY); // ❌ Error in browser code

// Server-safe
export async function api() {
  const secret = process.env.SECRET_KEY;
  return secret; // ✅ OK
}
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] No lint errors: `npm run lint`
- [ ] Environment variables set in deployment platform
- [ ] Database migrations reviewed and tested
- [ ] Google Drive API credentials valid
- [ ] Supabase database accessible
- [ ] Build succeeds: `npm run build`

### Build & Start

```bash
# Build for production
npm run build

# Start production server
npm start
# Listens on http://localhost:3000 by default
```

### Deployment Platforms

#### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# https://vercel.com/dashboard/project/settings/environment-variables
```

Environment variables should include:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_DRIVE_ROOT_FOLDER_ID
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY
```

#### Self-Hosted (Node.js + PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "tracer-system" -- start

# View logs
pm2 logs tracer-system

# Restart on reboot
pm2 startup
pm2 save
```

### Environment Variables for Deployment

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxxxx

# Google Drive
GOOGLE_DRIVE_ROOT_FOLDER_ID=xxxxx
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Placement Tracer System

# Optional Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
```

### Database Backup & Recovery

```bash
# Backup PostgreSQL
pg_dump -h db.xxxxx.supabase.co -U postgres dbname > backup.sql

# Restore from backup
psql -h db.xxxxx.supabase.co -U postgres dbname < backup.sql
```

Use Supabase's backup tools in dashboard for automated backups.

---

## Troubleshooting

### Common Issues & Solutions

#### "Session validation failed" Error

**Cause:** User's JWT expired or is invalid

**Solution:**

```typescript
// Check Supabase session
const {
  data: { session },
} = await supabase.auth.getSession();

// Force re-login
redirect("/signin");
```

#### Form Validation Failing

**Cause:** Form schema doesn't match submitted data

**Debug:**

```typescript
const result = SCHEMA.safeParse(data);
if (!result.success) {
  console.error("Validation errors:", result.error.flatten());
}
```

#### "Insufficient Permission" on Response

**Cause:** User's role/program scope doesn't match

**Check:**

```typescript
const user = await getCurrentUser();
console.log("Role:", user.role);
console.log("Coordinator grants:", user.coordinatorGrants);

// Verify program access
const canAccess = canAccessProgram(user, responseProgram);
console.log("Can access program:", canAccess);
```

#### Google Drive Upload Failing

**Cause:** Service account credentials invalid, Drive API not enabled, or quota exceeded

**Debug:**

```bash
# Test Google Drive API
curl -H "Authorization: Bearer $TOKEN" \
  https://www.googleapis.com/drive/v3/files?pageSize=1

# Check API quotas
# https://console.cloud.google.com/apis/dashboard
```

#### Database Connection Issues

**Cause:** Supabase down, network issue, or invalid credentials

**Check:**

```bash
# Test Supabase connection
PGPASSWORD=$PASSWORD psql -h db.xxx.supabase.co -U postgres -c "SELECT 1"

# Check Supabase status
# https://status.supabase.com
```

#### High Memory Usage

**Cause:** Large dataset operations, unoptimized queries, memory leaks

**Solutions:**

- Paginate API responses
- Use streaming for large exports
- Check for circular dependencies
- Monitor with `node --inspect`

#### Slow Page Loads

**Cause:** Unoptimized queries, large bundle, or missing indexes

**Solutions:**

```bash
# Analyze build bundle
npm run build
npm i -g @next/bundle-analyzer

# Check database indexes
SELECT * FROM pg_stat_user_indexes;
```

#### CSS Not Loading

**Cause:** Tailwind CSS not compiled, theme not applied

**Solutions:**

```bash
# Rebuild CSS
npm run build

# Check theme script in layout.tsx
# Verify _next/static/css/ exists

# Clear browser cache (Ctrl+Shift+Delete)
```

---

## Maintenance & Operations

### Regular Tasks

**Daily:**

- Monitor error logs
- Check Supabase status
- Verify backups completed

**Weekly:**

- Review audit logs
- Check for security updates
- Monitor disk space usage

**Monthly:**

- Update npm dependencies: `npm update`
- Run security audit: `npm audit`
- Review performance metrics
- Backup database

**Quarterly:**

- Major version updates
- Security assessment
- Performance optimization
- Disaster recovery drill

### Database Maintenance

```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM form_responses WHERE study_id = $1;

# Rebuild indexes
REINDEX TABLE form_responses;

# Vacuum (cleanup)
VACUUM ANALYZE;

# Connection count
SELECT count(*) FROM pg_stat_activity;
```

### Monitoring Checklist

- [ ] Application error rate < 0.1%
- [ ] Page load time < 2s (P95)
- [ ] Database query time < 100ms (P95)
- [ ] Uptime > 99.5%
- [ ] Backup size reasonable
- [ ] Email/notification delivery working

---

## Further Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs
- **Zod Validation:** https://zod.dev
- **React Hook Form:** https://react-hook-form.com

---

**Last Updated:** 2026-08-26
**Maintained By:** Placement Unit
**Questions?** Contact the Placement Unit development team
