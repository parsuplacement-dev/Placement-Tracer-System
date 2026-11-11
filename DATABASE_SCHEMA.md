# Database Schema & Data Model

Complete reference for the Placement Tracer System database.

## Overview

The database is organized into **5 logical domains**:

1. **Identity & Access** – User accounts, roles, permissions
2. **Studies & Forms** – Tracer studies and form definitions
3. **Responses** – Form response data and documents
4. **Google Drive** – File storage coordination
5. **Audit & Compliance** – Security event logging

---

## Domain 1: Identity & Access

### auth_accounts

Primary user account table (one per person, provider-neutral).

```sql
CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider linkage
  provider_user_id TEXT UNIQUE NOT NULL,  -- Google OAuth sub
  email TEXT UNIQUE NOT NULL,              -- Normalized email

  -- Application identity
  role TEXT NOT NULL DEFAULT 'alumni',     -- 'admin' | 'coordinator' | 'alumni'

  -- Coordinator scope grants (JSONB array)
  coordinator_scope_grants JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast lookups
CREATE INDEX idx_auth_accounts_email ON auth_accounts(email);
CREATE INDEX idx_auth_accounts_role ON auth_accounts(role);
CREATE INDEX idx_auth_accounts_provider_user_id ON auth_accounts(provider_user_id);
```

**Notes:**

- `provider_user_id` is the Google OAuth subject ID
- `coordinator_scope_grants` is JSONB array: `[{"type":"program","value":"cs_bs"},...]`
- `is_active=false` disables login but preserves history
- `last_login_at` used for "unused account" detection

**Example Row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_user_id": "117123456789012345678",
  "email": "alice@parsu.edu.ph",
  "role": "coordinator",
  "coordinator_scope_grants": [
    { "type": "college", "value": "CIT" },
    { "type": "program", "value": "cs_bs" }
  ],
  "is_active": true,
  "created_at": "2025-09-01T08:00:00Z",
  "updated_at": "2025-09-25T10:15:00Z",
  "last_login_at": "2025-09-25T10:15:00Z"
}
```

---

## Domain 2: Studies & Forms

### form_versions

Published tracer form definitions (immutable, versioned).

```sql
CREATE TABLE form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Form identity
  form_name TEXT NOT NULL,                 -- e.g., "Graduate Tracer"
  version INTEGER NOT NULL,                -- 1, 2, 3, ...

  -- Schema
  schema JSONB NOT NULL,                   -- Complete form schema

  -- Status
  status TEXT DEFAULT 'draft',             -- 'draft' | 'published'

  -- Tracking
  created_by_admin_id UUID NOT NULL REFERENCES auth_accounts(id),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE (form_name, version)
);

CREATE INDEX idx_form_versions_status ON form_versions(status);
```

**Schema Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "form_name": "Graduate Tracer",
  "version": 1,
  "status": "published",
  "schema": {
    "title": "Graduate Tracer Study Form",
    "fields": [
      {
        "name": "name",
        "label": "Full Name",
        "type": "string",
        "required": true
      },
      {
        "name": "program",
        "label": "Program",
        "type": "select",
        "required": true,
        "options": [{ "value": "cs_bs", "label": "BS Computer Science" }]
      }
    ]
  },
  "published_at": "2025-09-01T00:00:00Z"
}
```

### studies

Study periods that bind a form version to academic year.

```sql
CREATE TABLE studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  form_version_id UUID NOT NULL REFERENCES form_versions(id),

  -- Metadata
  academic_year TEXT NOT NULL,             -- e.g., "2025-2026"
  study_title TEXT NOT NULL,               -- e.g., "Graduate Tracer 2025"
  description TEXT,

  -- Lifecycle
  status TEXT DEFAULT 'draft',             -- 'draft' | 'open' | 'closed' | 'archived'
  opening_date TIMESTAMP WITH TIME ZONE,
  closing_date TIMESTAMP WITH TIME ZONE,

  -- Drive folders
  drive_root_folder_id TEXT,               -- For this study

  -- Audit
  created_by_admin_id UUID NOT NULL REFERENCES auth_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE (academic_year, form_version_id)
);

CREATE INDEX idx_studies_status ON studies(status);
CREATE INDEX idx_studies_academic_year ON studies(academic_year);
CREATE INDEX idx_studies_created_by ON studies(created_by_admin_id);
```

**Example Row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "form_version_id": "550e8400-e29b-41d4-a716-446655440000",
  "academic_year": "2025-2026",
  "study_title": "Graduate Tracer Study 2025",
  "status": "open",
  "opening_date": "2025-09-01T00:00:00Z",
  "closing_date": "2025-12-31T23:59:59Z",
  "drive_root_folder_id": "1A2B3C4D5E6F7G8H9I",
  "created_by_admin_id": "550e8400-e29b-41d4-a716-446655440010",
  "created_at": "2025-09-01T08:00:00Z"
}
```

---

## Domain 3: Responses

### form_responses

Alumni responses to tracer forms.

```sql
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Respondent tracking
  user_id UUID REFERENCES auth_accounts(id),    -- NULL if imported
  entered_by_user_id UUID REFERENCES auth_accounts(id),

  -- Data
  source TEXT DEFAULT 'alumni',            -- 'alumni' | 'admin_import'
  status TEXT DEFAULT 'draft',             -- 'draft' | 'submitted'
  answers JSONB NOT NULL DEFAULT '{}',     -- Form answers
  display_name TEXT,                       -- Extracted name for sorting

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,     -- Soft delete

  -- Organization in Drive
  drive_folder_id TEXT,
  organize_status TEXT,                    -- 'pending' | 'completed' | 'failed'

  CONSTRAINT one_alumni_response_per_study UNIQUE (study_id, user_id)
    WHERE deleted_at IS NULL AND source = 'alumni',
  CONSTRAINT one_manual_draft_per_coordinator UNIQUE (study_id, entered_by_user_id)
    WHERE deleted_at IS NULL AND source = 'admin_import' AND status = 'draft'
);

-- Critical indexes
CREATE INDEX idx_form_responses_study_id ON form_responses(study_id);
CREATE INDEX idx_form_responses_user_id ON form_responses(user_id);
CREATE INDEX idx_form_responses_entered_by ON form_responses(entered_by_user_id);
CREATE INDEX idx_form_responses_status ON form_responses(status);
CREATE INDEX idx_form_responses_source ON form_responses(source);
CREATE INDEX idx_form_responses_submitted_at ON form_responses(submitted_at);
CREATE INDEX idx_form_responses_deleted_at ON form_responses(deleted_at);
CREATE INDEX idx_form_responses_display_name ON form_responses(display_name);
```

**Authorization:** Row-level security enforces:

- Admins see all
- Coordinators see only their programs
- Alumni see own only

**Example Row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "study_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440020",
  "entered_by_user_id": null,
  "source": "alumni",
  "status": "submitted",
  "answers": {
    "name": "John Doe",
    "email": "john.doe@parsu.edu.ph",
    "program": "cs_bs",
    "employment_status": "employed",
    "employer": "Acme Corporation",
    "position": "Software Engineer"
  },
  "display_name": "John Doe",
  "created_at": "2025-09-15T10:00:00Z",
  "submitted_at": "2025-09-20T15:30:00Z",
  "drive_folder_id": "9X8Y7Z6W5V",
  "organize_status": "completed"
}
```

### form_response_documents

Uploaded files attached to responses.

```sql
CREATE TABLE form_response_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  response_id UUID NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,

  -- Google Drive linkage
  google_drive_file_id TEXT UNIQUE NOT NULL,

  -- Upload tracking
  upload_status TEXT DEFAULT 'pending',    -- 'pending' | 'completed' | 'failed'
  upload_error TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  organized_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_form_response_documents_response_id
  ON form_response_documents(response_id);
CREATE INDEX idx_form_response_documents_upload_status
  ON form_response_documents(upload_status);
```

**Example Row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "response_id": "550e8400-e29b-41d4-a716-446655440002",
  "file_name": "diploma.pdf",
  "file_size": 524288,
  "mime_type": "application/pdf",
  "google_drive_file_id": "1A2B3C4D5E6F7G8H9I",
  "upload_status": "completed",
  "created_at": "2025-09-20T15:30:00Z",
  "organized_at": "2025-09-20T16:00:00Z"
}
```

---

## Domain 4: Google Drive

### google_drive_folders

Folder structure in Google Drive (indexed for management).

```sql
CREATE TABLE google_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Drive structure
  folder_name TEXT NOT NULL,
  google_folder_id TEXT UNIQUE NOT NULL,
  parent_google_drive_folder_id TEXT,

  -- Purpose classification
  purpose TEXT NOT NULL,  -- 'upload_staging' | 'study' | 'admin_files' | 'respondent'

  -- Relationships
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_google_drive_folders_google_folder_id
  ON google_drive_folders(google_folder_id);
CREATE INDEX idx_google_drive_folders_study_id
  ON google_drive_folders(study_id);
```

**Hierarchy Example:**

```
Configured Root
├── Upload Staging (upload_staging)
├── Graduate Tracer 2025 (study, study_id=X)
│   ├── Manila (respondent folder)
│   │   ├── CIT (respondent folder)
│   │   │   ├── CS BS (respondent folder)
│   │   │   │   ├── john.doe@parsu.edu.ph (respondent)
│   │   │   │   │   ├── Employment
│   │   │   │   │   └── Awards
│   │   │   │   └── jane.smith@parsu.edu.ph (respondent)
└── Admin Files (admin_files)
    └── 2025-2026
```

### google_drive_items

Indexed file/folder metadata (for browser UI).

```sql
CREATE TABLE google_drive_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Drive IDs
  google_file_id TEXT UNIQUE NOT NULL,
  google_parent_folder_id TEXT,

  -- Metadata
  name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,

  -- Ownership
  owned_by_email TEXT,

  -- Timestamps
  created_time TIMESTAMP WITH TIME ZONE,
  modified_time TIMESTAMP WITH TIME ZONE,
  accessed_time TIMESTAMP WITH TIME ZONE,

  -- Link for UI
  web_view_link TEXT
);

CREATE INDEX idx_google_drive_items_google_file_id
  ON google_drive_items(google_file_id);
```

---

## Domain 5: Audit & Compliance

### security_audit_events

Complete audit trail for compliance (NEVER delete).

```sql
CREATE TABLE security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  admin_id UUID NOT NULL REFERENCES auth_accounts(id),

  -- Event details
  event_type TEXT NOT NULL,  -- 'role_change' | 'export' | 'account_create'
                              -- | 'response_delete' | 'study_delete'
  resource_type TEXT,        -- 'user' | 'response' | 'study'
  resource_id UUID,

  -- Context
  details JSONB,
  ip_address INET,
  user_agent TEXT,

  -- Timestamp (immutable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT immutable CHECK (created_at = created_at)  -- Pseudo-constraint
);

-- Indexes for query performance (NEVER add WHERE deleted_at)
CREATE INDEX idx_security_audit_events_admin_id
  ON security_audit_events(admin_id);
CREATE INDEX idx_security_audit_events_event_type
  ON security_audit_events(event_type);
CREATE INDEX idx_security_audit_events_resource_type
  ON security_audit_events(resource_type);
CREATE INDEX idx_security_audit_events_created_at
  ON security_audit_events(created_at DESC);
```

**Event Types:**

- `role_change` – User role or scope changed
- `export` – Data exported to Excel
- `account_create` – New account created
- `account_delete` – Account deactivated
- `response_delete` – Response soft-deleted
- `study_delete` – Study soft-deleted
- `manual_response_import` – Batch import completed

**Example Row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "admin_id": "550e8400-e29b-41d4-a716-446655440010",
  "event_type": "response_export",
  "resource_type": "response",
  "resource_id": "550e8400-e29b-41d4-a716-446655440001",
  "details": {
    "filter_criteria": {
      "study_id": "550e8400-e29b-41d4-a716-446655440001",
      "program": "cs_bs"
    },
    "record_count": 42
  },
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-09-25T12:30:00Z"
}
```

---

## Complete Entity Relationship Diagram

```
auth_accounts (1)
  ├──> (many) studies.created_by_admin_id
  ├──> (many) form_responses.user_id
  ├──> (many) form_responses.entered_by_user_id
  └──> (many) security_audit_events.admin_id

form_versions (1)
  └──> (many) studies.form_version_id

studies (1)
  ├──> (many) form_responses.study_id
  ├──> (many) google_drive_folders.study_id
  └──> (many) security_audit_events.resource_id

form_responses (1)
  ├──> (many) form_response_documents.response_id
  └──> (many) security_audit_events.resource_id

form_response_documents (*)
  └──> (1) form_responses
```

---

## Row-Level Security (RLS) Policies

The database enforces authorization at SQL level (Supabase RLS):

### form_responses

```sql
-- Policy: Users can see own responses
CREATE POLICY "Alumni can select own responses"
  ON form_responses FOR SELECT
  USING (
    current_user_id() = user_id
    OR current_user_role() = 'admin'
    OR (
      current_user_role() = 'coordinator'
      AND has_program_access((answers->>'program')::text)
    )
  );

-- Admins can see all
CREATE POLICY "Admins see all responses"
  ON form_responses FOR SELECT
  USING (current_user_role() = 'admin');
```

**Never bypass RLS.** Always query through authorized repositories.

---

## Query Patterns

### Coordinator Views Own Data

```sql
SELECT *
FROM form_responses r
WHERE r.study_id = $1
  AND r.answers->>'program' = ANY($2)  -- $2 = coordinator's allowed programs
  AND r.deleted_at IS NULL;
```

### Admin Exports All

```sql
SELECT r.id, r.answers, d.file_name
FROM form_responses r
LEFT JOIN form_response_documents d ON r.id = d.response_id
WHERE r.study_id = $1
  AND r.status = 'submitted'
  AND r.deleted_at IS NULL
ORDER BY r.submitted_at DESC;
```

### Find Unorganized Documents

```sql
SELECT r.id, d.id, d.file_name
FROM form_responses r
JOIN form_response_documents d ON r.id = d.response_id
WHERE r.organize_status = 'pending'
  AND d.upload_status = 'completed'
  AND r.deleted_at IS NULL;
```

---

## Migrations

All schema changes are version-controlled as append-only SQL migrations:

```
supabase/migrations/
├── 20260713000953_create_tracer_schema.sql
├── 20260723000000_add_versioned_studies.sql
├── 20260723010000_add_manual_form_responses.sql
├── ...
└── 20260810000000_expand_security_audit_events.sql
```

**Never edit migrations.** Add new migrations for changes.

---

## Performance Considerations

### Indexes

- `form_responses(study_id, status)` – Common filters
- `form_responses(user_id)` – Alumni dashboard
- `form_responses(submitted_at DESC)` – Sorting
- `security_audit_events(created_at DESC)` – Audit queries
- All foreign keys are indexed automatically

### Partitioning (Future)

For large datasets, consider partitioning by study:

```sql
PARTITION BY RANGE (study_id)
```

### Query Optimization

- Always use indexed columns in WHERE clauses
- Avoid large scans: use LIMIT
- Join carefully: prefer denormalization (answers JSONB)
- Monitor with `EXPLAIN ANALYZE`

---

## Backup Strategy

- **Automated:** Supabase auto-backup daily
- **Manual:** `pg_dump` for point-in-time
- **Retention:** Keep 30-day rolling backup
- **Testing:** Monthly restore test to staging

---

**Last Updated:** 2026-08-26
