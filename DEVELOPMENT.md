# Development Guide – Placement Tracer System

Practical guidelines for developers working on the Placement Tracer System.

## Development Environment Setup

### Prerequisites

- **Node.js:** 20.9 or newer (verify with `node --version`)
- **npm:** Latest version (verify with `npm --version`)
- **Git:** For version control
- **VS Code:** Recommended IDE with TypeScript support
- **Supabase CLI:** For database migrations

### Editor Setup

**Recommended VS Code Extensions:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.typescript-vue-plugin",
    "supabase.supabase-js"
  ]
}
```

Install with: `code --install-extension <extension-id>`

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/tracer-system.git
cd tracer-system

# Install dependencies
npm ci

# Create .env.local (see QUICK_START.md)
echo "NEXT_PUBLIC_SUPABASE_URL=..." > .env.local

# Start dev server
npm run dev

# In another terminal, watch migrations
npx supabase migration list --watch
```

---

## Project Structure Deep Dive

### Root Files

```
├── package.json            – Dependencies and scripts
├── tsconfig.json          – TypeScript configuration
├── next.config.ts         – Next.js configuration (security headers)
├── eslint.config.mjs      – Code quality rules
├── components.json        – shadcn component registry
├── postcss.config.mjs      – Tailwind CSS configuration
├── tailwind.config.ts      – CSS utility configuration
├── proxy.ts               – Edge middleware (rate limiting, guards)
├── design.md              – UI/UX design system
├── TUTORIAL.md            – Complete documentation (THIS FILE)
├── QUICK_START.md         – 10-minute setup
├── API_REFERENCE.md       – API endpoint docs
├── DATABASE_SCHEMA.md     – Database reference
└── DEVELOPMENT.md         – Developer guide
```

### app/ – Routing & Pages

```
app/
├── layout.tsx             – Root layout (theme bootstrap)
├── globals.css            – Global styles + semantic tokens
├── error.tsx              – Global error boundary
├── global-error.tsx       – Next.js error fallback
│
├── (auth)/
│   ├── layout.tsx         – Auth layout (minimal)
│   └── signin/
│       └── page.tsx       – Google OAuth sign-in page
│
└── (protected)/
    ├── layout.tsx         – Authenticated layout (with nav)
    ├── page.tsx           – Alumni dashboard
    ├── error.tsx          – Protected route error handler
    │
    ├── admin/             – Admin-only pages
    │   ├── accounts/      – User management
    │   ├── studies/       – Study management
    │   ├── responses/     – Response admin
    │   └── files/         – Drive file browser
    │
    ├── alumni/            – Alumni pages
    │   └── responses/     – Tracer form submission
    │
    └── api/               – API route handlers (see section below)
```

### components/ – Reusable UI

```
components/
├── ui/                    – Primitive components (inputs, buttons, etc)
│   ├── button.tsx         – Button with variants
│   ├── input.tsx          – Text input
│   ├── table.tsx          – Data table
│   ├── Modal.tsx          – Modal container
│   ├── ConfirmationDialog.tsx
│   ├── Toast.tsx          – Notifications
│   ├── ErrorState.tsx     – Error display
│   ├── LoadingState.tsx   – Loading skeleton
│   ├── button-variants.ts – Button semantic variants
│   ├── icons.tsx          – Icon mapping
│   └── ...
│
├── forms/                 – Form components
│   ├── GraduateTracerForm.tsx  – Main form component
│   ├── FileUploadField.tsx     – File upload input
│   ├── StringListField.tsx     – Multi-value input
│   ├── SelectField.tsx         – Select dropdown
│   └── graduate-tracer/        – Form-specific UI
│
├── auth/                  – Authentication UI
│   ├── SessionKeepAlive.tsx    – Token refresh logic
│   ├── RoleChangeNotice.tsx    – Role change alert
│   └── SignOutButton.tsx       – Logout
│
├── admin/                 – Admin-only UI
│   ├── ExportButton.tsx        – Export trigger
│   ├── dashboard/
│   ├── accounts/
│   ├── responses/
│   ├── studies/
│   └── files/
│
├── responses/             – Response viewing/editing
│   ├── ResponseTable.tsx       – List view
│   ├── ResponseWorkspace.tsx   – Detail view
│   └── ReadOnlyResponseDetails.tsx
│
├── layout/                – Layout components
│   ├── DashboardNavigation.tsx  – Top/side nav
│   └── ScrollContainer.tsx      – Scroll management
│
└── settings/              – User settings
    ├── SettingsPage.tsx        – Settings container
    ├── ColorThemePreference.tsx – Theme selector
    └── MotionPreference.tsx     – Reduced motion toggle
```

### lib/ – Business Logic

```
lib/
├── auth/                  – Authentication & authorization
│   ├── current-user.ts    – Get verified user from session
│   ├── require-user.ts    – Enforce auth (throw on missing)
│   ├── roles.ts           – Role checks and program access
│   ├── types.ts           – AuthUser type definition
│   ├── constants.ts       – Role constants
│   ├── provider.ts        – Supabase session provider
│   └── providers/         – OAuth provider logic
│
├── repositories/          – Supabase queries (DAL)
│   ├── form-responses.ts  – Response CRUD
│   ├── studies.ts         – Study CRUD
│   ├── forms.ts           – Form queries
│   ├── accounts.ts        – Account queries
│   └── ...
│
├── forms/                 – Form validation & lifecycle
│   ├── validation.ts      – Zod schemas
│   ├── lifecycle.ts       – State transitions
│   ├── graduate-tracer.ts – Tracer form specifics
│   └── *.test.ts          – Form tests
│
├── google-drive/          – Google Drive API wrapper
│   ├── client.ts          – Drive API initialization
│   ├── upload.ts          – Resumable uploads
│   ├── organize.ts        – Folder organization
│   ├── index.ts           – File indexing
│   └── cleanup.ts         – Drive cleanup/deletion
│
├── surveys/               – Study & form management
│   ├── queries.ts         – Complex queries
│   ├── mutations.ts       – Create/update operations
│   └── lifecycle.ts       – Study state machine
│
├── exports/               – Excel/CSV export logic
│   ├── responses.ts       – Response data formatting
│   ├── accounts.ts        – Account data formatting
│   ├── excel.ts           – ExcelJS wrapper + protection
│   ├── audit-events.ts    – Audit export
│   └── *.test.ts
│
├── security/              – Audit logging & protection
│   ├── audit.ts           – Audit event logging
│   ├── formula-injection.ts – Excel cell protection
│   └── rate-limit.ts      – Rate limiting
│
├── programs/              – Organization structure
│   ├── catalog.ts         – Campus/college/program mapping
│   └── validation.ts      – Scope validation
│
├── hooks/                 – React hooks
│   ├── useCurrentUser.ts  – Get user in components
│   ├── useFormState.ts    – Form state management
│   ├── useAsync.ts        – Async state wrapper
│   └── ...
│
├── server/                – Server utilities
│   ├── supabase.ts        – Supabase client
│   └── response.ts        – HTTP response helpers
│
├── supabase/              – Supabase configuration
│   ├── client.ts          – Browser client
│   └── server.ts          – Server client
│
├── google/                – Google API configuration
│   └── oauth.ts           – Google OAuth setup
│
├── admin/                 – Admin-specific logic
│   └── response-query.ts  – Filtered response queries
│
├── utils.ts               – Shared utilities (formatters, etc)
├── confirmation-code.ts   – Verification code generation
└── constants.ts           – App-wide constants
```

### types/ – Shared Type Definitions

```
types/
├── index.ts               – Main type exports
├── roles.ts               – Role types
├── forms.ts               – Form data types
├── survey.ts              – Study/form types
├── survey-document.ts     – Document types
├── google-drive.ts        – Drive types
└── audit.ts               – Audit event types
```

### supabase/ – Database Configuration

```
supabase/
├── config.toml            – Supabase project config
└── migrations/            – SQL migrations
    ├── 20260713000953_create_tracer_schema.sql
    ├── 20260723000000_add_versioned_studies.sql
    └── ... (append-only)
```

### scripts/ – Utility Scripts

```
scripts/
└── migrate-appwrite-accounts.ts  – Data migration helper
```

---

## Coding Patterns

### 1. Server Components (Default)

```typescript
// app/(protected)/admin/responses/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { getResponses } from "@/lib/repositories/form-responses";
import { ResponseTable } from "@/components/responses/ResponseTable";

export default async function ResponsesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const responses = await getResponses({ studyId: params.studyId });

  return <ResponseTable responses={responses} />;
}
```

### 2. Client Components (Use Sparingly)

```typescript
// components/forms/GraduateTracerForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RESPONSE_SCHEMA } from "@/lib/forms/validation";

export function GraduateTracerForm({ studyId, onSubmit }) {
  const form = useForm({
    resolver: zodResolver(RESPONSE_SCHEMA),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 3. API Routes

```typescript
// app/api/form-responses/route.ts
import { getCurrentUser } from "@/lib/auth";
import { createResponse } from "@/lib/repositories/form-responses";

export async function POST(request: Request) {
  // 1. Authenticate
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate
  const body = await request.json();
  const validated = RESPONSE_SCHEMA.parse(body);

  // 3. Authorize
  if (user.id !== validated.user_id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Execute
  try {
    const response = await createResponse(validated);
    return Response.json({ data: response }, { status: 201 });
  } catch (error) {
    console.error("Create response error:", error);
    return Response.json(
      { error: "Failed to create response" },
      { status: 500 },
    );
  }
}
```

### 4. Database Access Layer

```typescript
// lib/repositories/form-responses.ts
import { supabaseServer } from "@/lib/supabase/server";

export async function getResponse(id: string) {
  const { data, error } = await supabaseServer
    .from("form_responses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Query failed: ${error.message}`);
  return data;
}

export async function createResponse(data: unknown) {
  const validated = RESPONSE_SCHEMA.parse(data);

  const { data: response, error } = await supabaseServer
    .from("form_responses")
    .insert([validated])
    .select()
    .single();

  if (error) throw new Error(`Insert failed: ${error.message}`);
  return response;
}
```

### 5. Form Validation

```typescript
// lib/forms/validation.ts
import { z } from "zod";

export const RESPONSE_SCHEMA = z.object({
  study_id: z.string().uuid(),
  answers: z.object({
    name: z.string().min(1, "Name required"),
    email: z.string().email("Invalid email"),
    program: z.enum(["cs_bs", "it_bs", "educ_bs"]),
    employment_status: z.enum(["employed", "unemployed", "further_study"]),
  }),
  status: z.enum(["draft", "submitted"]),
});

// Type-safe inference
export type ResponseData = z.infer<typeof RESPONSE_SCHEMA>;
```

### 6. Authorization Checks

```typescript
// Usage in API route
import { requireRole, canAccessProgram } from "@/lib/auth/roles";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  // Option 1: Require specific role
  try {
    requireRole(user, [ROLES.ADMIN]);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Option 2: Check program access (coordinator)
  const program = request.nextUrl.searchParams.get("program");
  if (!canAccessProgram(user, program)) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }
}
```

### 7. Error Handling

```typescript
// Consistent error handling pattern
try {
  const result = await operation();
  return Response.json({ data: result });
} catch (error) {
  // Type-safe error handling
  if (error instanceof ValidationError) {
    return Response.json(
      { error: "Validation failed", details: error.details },
      { status: 400 },
    );
  }

  if (error instanceof AuthError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Log unhandled errors
  console.error("Unexpected error:", {
    error,
    message: error instanceof Error ? error.message : "Unknown",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

### 8. Async Data Patterns

```typescript
// Server component with proper error handling
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  try {
    const data = await loadData();
    return <Component data={data} />;
  } catch (error) {
    // notFound() for missing resources
    if (error instanceof NotFoundError) notFound();

    // Throw errors to error.tsx boundary
    throw error;
  }
}

// Client-side data fetching
"use client";

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/data")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => setData(d.data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
```

---

## Testing Guidelines

### Unit Tests

```typescript
// lib/forms/validation.test.ts
import { test } from "node:test";
import assert from "node:assert";
import { RESPONSE_SCHEMA } from "./validation";

test("RESPONSE_SCHEMA validates complete responses", () => {
  const valid = {
    study_id: "550e8400-e29b-41d4-a716-446655440000",
    answers: {
      name: "John Doe",
      email: "john@parsu.edu.ph",
      program: "cs_bs",
      employment_status: "employed",
    },
    status: "submitted",
  };

  const result = RESPONSE_SCHEMA.safeParse(valid);
  assert.strictEqual(result.success, true);
});

test("RESPONSE_SCHEMA rejects incomplete responses", () => {
  const invalid = {
    study_id: "550e8400-e29b-41d4-a716-446655440000",
    answers: { name: "" }, // Missing required fields
    status: "submitted",
  };

  const result = RESPONSE_SCHEMA.safeParse(invalid);
  assert.strictEqual(result.success, false);
});
```

Run tests:

```bash
npm test                    # All tests
npm run test:forms         # Specific suite
npm test -- --grep "validates"  # Filter by name
```

### Integration Tests

```typescript
// (Future: add with test framework if needed)
```

---

## Performance Best Practices

### 1. Optimize Database Queries

```typescript
// ❌ Bad: N+1 queries
const responses = await getResponses();
for (const r of responses) {
  const documents = await getDocuments(r.id); // Query per response!
}

// ✅ Good: Single query with join
const responses = await supabaseServer
  .from("form_responses")
  .select("*, form_response_documents(*)") // Include related data
  .eq("study_id", studyId);
```

### 2. Use Pagination

```typescript
// ✅ Good: Paginate large result sets
const { data, count } = await supabaseServer
  .from("form_responses")
  .select("*", { count: "exact" })
  .eq("study_id", studyId)
  .range(0, 49); // Limit 50

// In API
return Response.json({
  data,
  total: count,
  hasMore: count > offset + limit,
});
```

### 3. Leverage Caching

```typescript
// Revalidate specific routes
export const revalidate = 60; // Revalidate every 60s

// On-demand revalidation
import { revalidatePath } from "next/cache";

export async function updateStudy(id: string, data: unknown) {
  await updateStudyInDb(id, data);
  revalidatePath(`/admin/studies/${id}`);
}
```

### 4. Optimize Build Size

```bash
# Analyze bundle
npm run build

# Check dependencies for unused code
npm ls --depth=0
```

---

## Security Practices

### 1. Environment Variables

```typescript
// ✅ OK: Server-only
const apiSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ OK: Browser-safe public
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ❌ WRONG: Server secret in browser code
const secret = process.env.SECRET; // Error if used client-side
```

### 2. Authentication

```typescript
// Always verify on protected routes
const user = await getCurrentUser();
if (!user) redirect("/signin");

// Re-verify in API handlers
if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

### 3. SQL Injection Protection

```typescript
// ✅ Always use parameterized queries
const { data } = await supabaseServer
  .from("form_responses")
  .select("*")
  .eq("id", id); // Supabase auto-parameterizes

// ❌ NEVER concatenate user input
const result = await db.raw(`SELECT * FROM responses WHERE id = '${id}'`);
```

### 4. CSRF Protection

```typescript
// Next.js automatic: use Form component or fetch with proper headers
import { Form } from "next/form"; // Auto-adds CSRF token

// Or manual
const response = await fetch("/api/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  credentials: "include", // Send cookies
});
```

### 5. XSS Prevention

```typescript
// ✅ React automatically escapes by default
<div>{userInput}</div>  // Safe

// ⚠️ Only use dangerouslySetInnerHTML if necessary
<div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />

// Use DOMPurify or similar for sanitization
import DOMPurify from "isomorphic-dompurify";
const clean = DOMPurify.sanitize(html);
```

---

## Debugging Tips

### View Browser Console

```bash
# Development
npm run dev

# Access http://localhost:3000
# Open DevTools: F12
```

### Server Logs

```bash
# Check terminal running `npm run dev`
# Look for console.log/console.error output
```

### Database Debugging

```typescript
// Log queries
const { data, error } = await supabaseServer.from("form_responses").select("*");

console.log("Query result:", { data, error });
```

### Network Debugging

```bash
# DevTools → Network tab → Find request
# Check:
#   - Status code (200, 400, 401, 403, 500)
#   - Response body (error message)
#   - Headers (authentication, content-type)
```

### Performance Debugging

```bash
# Chrome DevTools → Performance tab
# Record and analyze for bottlenecks

# Check Next.js build performance
npm run build
# Look for slow routes in .next/trace output
```

---

## Common Gotchas

### 1. Async/Await in Event Handlers

```typescript
// ❌ Wrong: Missing await
const handleSubmit = async () => {
  createResponse(data); // Not awaited!
};

// ✅ Correct
const handleSubmit = async () => {
  try {
    await createResponse(data);
  } catch (error) {
    console.error("Error:", error);
  }
};
```

### 2. Stale Closures

```typescript
// ❌ Wrong: `userId` captured at render time
useEffect(() => {
  const timer = setInterval(() => {
    console.log(userId); // May be stale
  }, 1000);
}, []);

// ✅ Correct: Include dependency
useEffect(() => {
  const timer = setInterval(() => {
    console.log(userId);
  }, 1000);
}, [userId]);
```

### 3. Missing Error Boundaries

```typescript
// ❌ Unhandled promise rejection
export async function Page() {
  const data = await fetch("/api/data").then((r) => r.json()); // No catch!
}

// ✅ Proper error handling
try {
  const data = await fetch("/api/data").then((r) => r.json());
} catch (error) {
  throw error; // Caught by error.tsx
}
```

---

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm start                  # Run production build

# Testing & Quality
npm test                   # Run all tests
npm run lint              # Check code quality
npm run format            # Auto-format code
npm run format:check      # Check formatting

# Database
npx supabase db push      # Run migrations
npx supabase migration new [name]  # Create migration
npx supabase db reset     # Reset database

# Dependency Management
npm ci                    # Clean install (reproducible)
npm update               # Update dependencies
npm audit                # Check security vulnerabilities
```

---

**Last Updated:** 2026-08-26

**For questions or updates, contact the Placement Unit development team.**
