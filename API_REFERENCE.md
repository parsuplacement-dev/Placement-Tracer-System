# API Reference – Placement Tracer System

Complete reference for all API endpoints.

## Base URL

```
http://localhost:3000/api              (Development)
https://yourdomain.com/api             (Production)
```

## Authentication

All endpoints require valid Supabase JWT (sent as HTTP-only cookie by browser automatically).

### Response Format

Success:

```json
{
  "data": { "id": "123", ... }
}
```

Error:

```json
{
  "error": "Descriptive message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## Auth Endpoints

### POST /api/auth/callback

**Purpose:** Google OAuth callback handler

**Query Parameters:**

```
code=AUTH_CODE&state=STATE
```

**Response:**

```json
Redirects to /signin/complete or main dashboard
```

---

## Studies (Admin Only)

### GET /api/admin/studies

**Purpose:** List all studies

**Query Parameters:**

```
status=open|closed|archived|draft    (Optional)
academic_year=2025-2026               (Optional)
search=query                          (Optional)
limit=50&offset=0                     (Optional pagination)
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "form_version_id": "uuid",
      "academic_year": "2025-2026",
      "study_title": "Graduate Tracer 2025",
      "status": "open",
      "opening_date": "2025-09-01T00:00:00Z",
      "closing_date": "2025-12-31T23:59:59Z",
      "created_by_admin_id": "uuid",
      "created_at": "2025-09-01T00:00:00Z",
      "updated_at": "2025-09-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

### POST /api/admin/studies

**Purpose:** Create a new study

**Body:**

```json
{
  "form_version_id": "uuid",
  "academic_year": "2025-2026",
  "study_title": "Graduate Tracer 2025",
  "opening_date": "2025-09-01T00:00:00Z",
  "closing_date": "2025-12-31T23:59:59Z"
}
```

**Response:** `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "form_version_id": "uuid",
    ...
  }
}
```

### GET /api/admin/studies/[studyId]

**Purpose:** Get study detail

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "study_title": "Graduate Tracer 2025",
    "status": "open",
    ...
  }
}
```

### PATCH /api/admin/studies/[studyId]

**Purpose:** Update study metadata

**Body:**

```json
{
  "study_title": "Updated Title",
  "opening_date": "2025-09-01T00:00:00Z",
  "closing_date": "2025-12-31T23:59:59Z"
}
```

### POST /api/admin/studies/[studyId]/status

**Purpose:** Change study status (open, close, archive)

**Body:**

```json
{
  "status": "open" | "closed" | "archived"
}
```

### DELETE /api/admin/studies/[studyId]

**Purpose:** Delete study (soft delete with Drive cleanup)

**Response:** `204 No Content`

---

## Responses (Admin/Coordinator)

### GET /api/admin/responses

**Purpose:** List responses with filtering

**Query Parameters:**

```
studyId=uuid                          (Required for coordinators)
program=cs_bs                         (Optional)
status=draft|submitted                (Optional)
search=name                           (Optional)
sort_by=submitted_at                  (Optional)
sort_order=asc|desc                   (Optional)
limit=50&offset=0                     (Optional)
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "study_id": "uuid",
      "user_id": "uuid",
      "entered_by_user_id": "uuid",
      "source": "alumni" | "admin_import",
      "status": "draft" | "submitted",
      "answers": { "name": "John Doe", "program": "cs_bs", ... },
      "created_at": "2025-09-15T10:00:00Z",
      "submitted_at": "2025-09-20T15:30:00Z",
      "document_count": 3
    }
  ],
  "total": 42
}
```

### GET /api/admin/responses/[responseId]

**Purpose:** Get full response detail with documents

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "study_id": "uuid",
    "answers": { ... },
    "documents": [
      {
        "id": "uuid",
        "file_name": "certificate.pdf",
        "file_size": 245632,
        "google_drive_file_id": "drive-id",
        "upload_status": "completed",
        "created_at": "2025-09-20T15:30:00Z"
      }
    ],
    "notes": "Coordinator notes here",
    "created_at": "2025-09-15T10:00:00Z",
    "updated_at": "2025-09-25T12:00:00Z"
  }
}
```

### POST /api/admin/responses

**Purpose:** Create manual response draft

**Body:**

```json
{
  "study_id": "uuid",
  "program": "cs_bs",
  "source": "admin_import"
}
```

### PATCH /api/admin/responses/[responseId]

**Purpose:** Update response data

**Body:**

```json
{
  "answers": { "name": "Jane Doe", "employment_status": "employed" },
  "status": "draft" | "submitted",
  "notes": "Updated coordinator notes"
}
```

### POST /api/admin/responses/[responseId]/import

**Purpose:** Import batch data and documents

**Body:** `multipart/form-data`

```
csv_file=<File>
documents[0]=<File>
documents[1]=<File>
```

**Response:**

```json
{
  "data": {
    "response_id": "uuid",
    "imported_row_count": 42,
    "document_count": 3,
    "errors": []
  }
}
```

### POST /api/admin/responses/[responseId]/organize

**Purpose:** Organize uploaded documents in Google Drive

**Response:**

```json
{
  "data": {
    "organized_count": 3,
    "failed_count": 0,
    "status": "completed"
  }
}
```

### DELETE /api/admin/responses/[responseId]

**Purpose:** Delete response (soft delete)

**Response:** `204 No Content`

### GET /api/admin/responses/export

**Purpose:** Export responses as Excel file

**Query Parameters:**

```
study_id=uuid
program=cs_bs                         (Optional)
status=submitted                      (Optional)
start_date=2025-09-01T00:00:00Z      (Optional)
end_date=2025-12-31T23:59:59Z        (Optional)
```

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

```
Binary Excel file with formatted spreadsheet
```

**Side Effects:** Logs audit event of type `response_export`

---

## Form Responses (Alumni)

### GET /api/form-responses

**Purpose:** Get current user's responses

**Query Parameters:**

```
study_id=uuid                         (Optional)
status=draft|submitted                (Optional)
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "study_id": "uuid",
      "status": "draft",
      "answers": { ... },
      "submitted_at": null,
      "created_at": "2025-09-15T10:00:00Z",
      "updated_at": "2025-09-25T12:00:00Z"
    }
  ]
}
```

### POST /api/form-responses

**Purpose:** Create or update own response

**Body:**

```json
{
  "study_id": "uuid",
  "answers": {
    "name": "John Doe",
    "email": "john@parsu.edu.ph",
    "program": "cs_bs",
    "employment_status": "employed",
    "employer": "Acme Corp",
    ...
  },
  "status": "draft" | "submitted"
}
```

**Validation:** Zod schema checks all answers before accepting

**Response:** `200 OK` or `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "study_id": "uuid",
    "status": "draft",
    "answers": { ... },
    "created_at": "2025-09-15T10:00:00Z",
    "updated_at": "2025-09-25T12:00:00Z"
  }
}
```

### GET /api/form-responses/[responseId]

**Purpose:** Get own response detail

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "status": "draft",
    "answers": { ... },
    "documents": [ ... ],
    "can_edit": true,
    "can_submit": true
  }
}
```

### DELETE /api/form-responses/[responseId]

**Purpose:** Delete own response

**Response:** `204 No Content`

---

## Forms

### GET /api/forms

**Purpose:** List published form versions

**Query Parameters:**

```
status=published|draft
limit=50&offset=0
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "form_name": "Graduate Tracer",
      "version": 1,
      "status": "published",
      "schema": { ... },
      "published_at": "2025-09-01T00:00:00Z",
      "field_count": 15
    }
  ]
}
```

### GET /api/forms/[formVersionId]

**Purpose:** Get form schema and fields

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "form_name": "Graduate Tracer",
    "version": 1,
    "fields": [
      {
        "name": "name",
        "label": "Full Name",
        "type": "string",
        "required": true,
        "description": "Your full legal name"
      },
      {
        "name": "program",
        "label": "Program",
        "type": "select",
        "options": [
          { "value": "cs_bs", "label": "BS Computer Science" },
          ...
        ]
      }
    ]
  }
}
```

---

## Accounts (Admin Only)

### GET /api/admin/accounts

**Purpose:** List all user accounts

**Query Parameters:**

```
role=admin|coordinator|alumni
status=active|inactive
search=email
limit=50&offset=0
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "john@parsu.edu.ph",
      "role": "coordinator",
      "created_at": "2025-09-01T00:00:00Z",
      "last_login": "2025-09-25T10:15:00Z",
      "coordinator_scope_grants": [{ "type": "program", "value": "cs_bs" }]
    }
  ],
  "total": 42
}
```

### POST /api/admin/accounts

**Purpose:** Create new account

**Body:**

```json
{
  "email": "newuser@parsu.edu.ph",
  "role": "coordinator",
  "coordinator_scope_grants": [
    { "type": "campus", "value": "Manila" },
    { "type": "program", "value": "cs_bs" }
  ]
}
```

### PATCH /api/admin/accounts/[accountId]

**Purpose:** Update account role/scope

**Body:**

```json
{
  "role": "admin" | "coordinator" | "alumni",
  "coordinator_scope_grants": [ ... ]
}
```

**Side Effects:** Logs audit event of type `role_change`

### DELETE /api/admin/accounts/[accountId]

**Purpose:** Deactivate account

**Response:** `204 No Content`

### GET /api/admin/accounts/export

**Purpose:** Export all accounts as Excel

**Response:** Excel file

**Side Effects:** Logs audit event of type `accounts_export`

---

## Audit Events (Admin Only)

### GET /api/admin/audit-events

**Purpose:** List security events

**Query Parameters:**

```
event_type=role_change|export|account_create
resource_type=user|study|response
start_date=2025-09-01T00:00:00Z
end_date=2025-12-31T23:59:59Z
limit=100&offset=0
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "admin_id": "uuid",
      "event_type": "response_export",
      "resource_type": "response",
      "resource_id": "uuid",
      "details": {
        "filter_criteria": { "program": "cs_bs" },
        "record_count": 42
      },
      "created_at": "2025-09-25T12:30:00Z"
    }
  ],
  "total": 156
}
```

### GET /api/admin/audit-events/export

**Purpose:** Export audit log as Excel

**Query Parameters:** (same as list)

**Response:** Excel file

---

## Files (Admin Only)

### GET /api/admin/files

**Purpose:** Browse Google Drive files

**Query Parameters:**

```
folder_id=drive-folder-id           (Optional)
search=filename
limit=50&offset=0
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "certificate.pdf",
      "type": "file",
      "size": 245632,
      "mime_type": "application/pdf",
      "created_time": "2025-09-25T12:00:00Z",
      "google_drive_file_id": "drive-id",
      "webViewLink": "https://drive.google.com/file/d/.../view"
    }
  ],
  "total": 42
}
```

### POST /api/admin/files/upload

**Purpose:** Upload file to Google Drive

**Body:** `multipart/form-data`

```
file=<File>
folder_id=drive-folder-id
```

**Response:**

```json
{
  "data": {
    "file_id": "uuid",
    "google_drive_file_id": "drive-id",
    "name": "document.pdf",
    "size": 245632
  }
}
```

### GET /api/admin/files/[fileId]/content

**Purpose:** Download/view file content

**Headers:** `Content-Security-Policy: frame-ancestors 'self'`

**Response:** File content (browser iframe-safe)

### POST /api/admin/files/initialize

**Purpose:** Initialize Drive structure for new study

**Body:**

```json
{
  "study_id": "uuid"
}
```

**Response:**

```json
{
  "data": {
    "root_folder_id": "drive-id",
    "upload_staging_folder_id": "drive-id",
    "admin_files_folder_id": "drive-id"
  }
}
```

---

## Error Codes

| Code               | Status | Meaning                  |
| ------------------ | ------ | ------------------------ |
| `UNAUTHORIZED`     | 401    | No valid session         |
| `FORBIDDEN`        | 403    | Insufficient permissions |
| `NOT_FOUND`        | 404    | Resource not found       |
| `VALIDATION_ERROR` | 400    | Invalid input data       |
| `CONFLICT`         | 409    | Business rule violation  |
| `RATE_LIMIT`       | 429    | Too many requests        |
| `INTERNAL_ERROR`   | 500    | Server error             |

---

## Rate Limiting

API endpoints are rate-limited:

- **Per user:** 1000 requests/hour
- **Per IP:** 10,000 requests/hour
- **Export endpoints:** 100 requests/hour

Headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1695465600
```

---

## Pagination

For endpoints returning lists, use:

```
limit=50      (Default: 50, Max: 100)
offset=0      (Default: 0)
```

Response includes `total` count for UI pagination.

---

## Sorting

For endpoints supporting sort:

```
sort_by=created_at|name|status|submitted_at
sort_order=asc|desc                  (Default: desc)
```

---

## Examples

### Complete Workflow: Alumni Submits Response

```bash
# 1. Get open studies
curl https://api.example.com/api/studies

# 2. Get form schema
curl https://api.example.com/api/forms/[formId]

# 3. Create/save draft response
curl -X POST https://api.example.com/api/form-responses \
  -H "Content-Type: application/json" \
  -d '{
    "study_id": "uuid",
    "answers": { "name": "John", ... },
    "status": "draft"
  }'

# 4. Upload document (handled by FileUploadField component)

# 5. Submit final response
curl -X PATCH https://api.example.com/api/form-responses/[responseId] \
  -H "Content-Type: application/json" \
  -d '{ "status": "submitted" }'
```

### Coordinator Exports Data

```bash
curl -X GET "https://api.example.com/api/admin/responses/export?study_id=uuid&program=cs_bs" \
  -H "Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  > responses.xlsx
```

---

**Last Updated:** 2026-08-26
