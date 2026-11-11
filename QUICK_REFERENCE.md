# Quick Reference Card – Placement Tracer System

**Print this page and keep it handy!**

---

## 🚀 Essential Commands

```bash
# DEVELOPMENT
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm start                # Run production build locally

# TESTING & QUALITY
npm test                 # Run all tests
npm run lint             # Check code quality
npm run format           # Auto-format code
npm run format:check     # Check formatting without changing

# DATABASE
npx supabase db push     # Apply pending migrations
npx supabase db reset    # Reset to clean state (dev only!)

# DEPENDENCIES
npm ci                   # Clean install (use for CI/deployment)
npm update               # Update dependencies
npm audit                # Security audit
npm audit fix            # Auto-fix known vulnerabilities
```

---

## 🗂️ Key File Locations

| Need               | Location                                   |
| ------------------ | ------------------------------------------ |
| Add admin page     | `app/(protected)/admin/[feature]/page.tsx` |
| Add API endpoint   | `app/api/[route]/route.ts`                 |
| Add component      | `components/[category]/ComponentName.tsx`  |
| Database query     | `lib/repositories/[feature].ts`            |
| Form validation    | `lib/forms/validation.ts`                  |
| Auth check         | `lib/auth/roles.ts`                        |
| Org structure      | `lib/programs/catalog.ts`                  |
| Styling tokens     | `app/globals.css`                          |
| Design rules       | `design.md`                                |
| Database schema    | `supabase/migrations/*.sql`                |
| Environment config | `.env.local`                               |

---

## 🔐 Common Authorization Patterns

```typescript
// In Server Component or API Route
import { getCurrentUser } from "@/lib/auth";
import { requireRole, canAccessProgram } from "@/lib/auth/roles";

// Check if authenticated
const user = await getCurrentUser();
if (!user) redirect("/signin");

// Require admin role
requireRole(user, [ROLES.ADMIN]); // Throws if not admin

// Check program access (for coordinators)
if (!canAccessProgram(user, programId)) {
  throw new Error("Forbidden");
}

// Get allowed programs
const programs = getAllowedProgramValues(user);
```

---

## 📱 Component Patterns

```typescript
// Server Component (default, preferred)
export default async function Page() {
  const data = await loadData();
  return <Component data={data} />;
}

// Client Component (when needed for interactivity)
"use client";
export function InteractiveComponent() {
  const [state, setState] = useState();
  return <button onClick={() => setState()}>Click</button>;
}

// Form with validation
const form = useForm({
  resolver: zodResolver(SCHEMA),
});
```

---

## 📊 Database Queries

```typescript
// Get data
const { data, error } = await supabaseServer
  .from("form_responses")
  .select("*, form_response_documents(*)")
  .eq("study_id", studyId);

// Create
await supabaseServer
  .from("form_responses")
  .insert([{ study_id, answers, status: "draft" }]);

// Update
await supabaseServer
  .from("form_responses")
  .update({ status: "submitted" })
  .eq("id", id);

// Delete (soft delete recommended)
await supabaseServer
  .from("form_responses")
  .update({ deleted_at: new Date() })
  .eq("id", id);
```

---

## 🔧 API Route Template

```typescript
import { getCurrentUser } from "@/lib/auth";
import { requireRole } from "@/lib/auth/roles";

export async function POST(request: Request) {
  // 1. Authenticate
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Authorize
  try {
    requireRole(user, [ROLES.ADMIN]);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse & validate
  const body = await request.json();
  const validated = SCHEMA.parse(body);

  // 4. Execute
  try {
    const result = await operation(validated);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
```

---

## 🛠️ Common Problems & Solutions

| Problem                                   | Solution                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| **"Module not found"**                    | Check import path is relative: `@/lib/...` not `lib/...`                   |
| **"ReferenceError: process not defined"** | Add `"use client"` at top (client code can't use process.env)              |
| **"Cannot read property of undefined"**   | Check data loaded before rendering. Use `if (!data) return ...`            |
| **"Unauthorized" error**                  | Verify JWT cookie exists. Check auth session validity. Re-login if stale.  |
| **Test fails**                            | Run `npm test -- --grep "test name"` for single test. Check error message. |
| **Build fails**                           | Clear `.next`: `rm -rf .next` then rebuild. Check TypeScript errors.       |
| **Database connection error**             | Verify Supabase URL and key in `.env.local`. Check Supabase status.        |
| **Styling not applied**                   | Tailwind classes need rebuild. Verify semantic token used correctly.       |

---

## 🧪 Testing Template

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { function } from "./file";

test("should do something", async () => {
  const result = await function();
  assert.strictEqual(result, expected);
});

test("should handle error", () => {
  assert.throws(() => {
    function();
  });
});
```

Run: `npm test -- --grep "pattern"`

---

## 📤 Deploy Checklist

```bash
□ npm run lint              # No errors
□ npm test                  # All pass
□ npm run build             # Builds successfully
□ .env variables set in production
□ Database migrations applied
□ Google Drive credentials configured
□ Run: npm start            # Verify it starts
□ Test: curl http://localhost:3000
□ Deploy to production
□ Monitor logs for errors
```

---

## 🔍 Debugging Checklist

```
Browser Console (F12)
  □ Network tab → find failed request
  □ Status code (200, 400, 401, 403, 500)?
  □ Response error message?
  □ Console tab → any JavaScript errors?

Terminal (where npm run dev runs)
  □ Console.log outputs visible?
  □ Error stack trace present?
  □ Server error messages?

VS Code
  □ Syntax errors highlighted?
  □ Type errors shown?
  □ Linter warnings?

Database
  □ Query returns expected data?
  □ RLS policies blocking access?
  □ Indexes defined?
```

---

## 🎨 Styling Quick Reference

```typescript
// Semantic tokens (use these, not hardcoded colors)
className="bg-card text-foreground border-border"
className="bg-destructive text-white"
className="text-muted-foreground"

// Button variants
<Button variant="primary">Action</Button>
<Button variant="secondary">Alternative</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="destructive">Dangerous</Button>

// Container & spacing
className="max-w-4xl mx-auto px-4"
className="gap-4 p-6"

// Responsive
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="hidden md:block"
```

---

## 🌳 Organization Structure

```
Catalog: lib/programs/catalog.ts

Example Program:
{
  "cs_bs": {
    "campus": "Manila",
    "college": "CIT",
    "name": "BS Computer Science"
  }
}

Coordinator Access:
[
  { "type": "college", "value": "CIT" },
  { "type": "program", "value": "cs_bs" }
]
→ Can see: All CIT programs + specific CS BS
```

---

## 📧 Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx
GOOGLE_DRIVE_ROOT_FOLDER_ID=xxx
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Never commit .env.local!**

---

## 🧠 Mental Model

### Authentication

```
Google OAuth → Supabase Auth → JWT in Cookie → Re-verified on every request
```

### Authorization

```
Role (admin/coordinator/alumni) + Program Scope = Access Control
```

### Data Flow

```
Browser → Next.js Handler → lib/repositories (SQL queries with auth)
         → Supabase (RLS policies enforce authorization)
         → PostgreSQL Database
```

### Response Lifecycle

```
draft → submitted → (optional: update) → (optional: delete)
```

### Study Lifecycle

```
draft → open → closed → archived/deleted
```

---

## 📞 Quick Help

**Can't start server?**
→ Check Node version: `node --version`
→ Run: `npm ci && npm run dev`
→ Check `.env.local` exists

**Tests failing?**
→ Run: `npm test -- --grep "name"`
→ Check error output

**Database issues?**
→ Check Supabase dashboard
→ Run: `npx supabase db push`

**Lost in codebase?**
→ Read: INDEX.md
→ Search: Ctrl+Shift+F for function name

**Need documentation?**
→ TUTORIAL.md (comprehensive)
→ API_REFERENCE.md (endpoints)
→ DATABASE_SCHEMA.md (tables)
→ DEVELOPMENT.md (coding patterns)

---

## ⏱️ Common Task Times

| Task                 | Time      |
| -------------------- | --------- |
| Setup from scratch   | 30 min    |
| Make small UI change | 5-10 min  |
| Create new component | 20-30 min |
| Add new API endpoint | 30-45 min |
| Add database field   | 45-60 min |
| Fix failing test     | 15-30 min |
| Deploy to production | 10-15 min |

---

## 🚨 Before Committing Code

```bash
npm run format              # Auto-fix formatting
npm run lint                # Check for errors
npm test                    # Verify tests pass
git diff                    # Review changes
git add .                   # Stage changes
git commit -m "feat: ..."   # Meaningful message
git push                    # Push to remote
```

---

## 📚 Documentation Map

| Need                | File               |
| ------------------- | ------------------ |
| Overview            | README.md          |
| Quick setup         | QUICK_START.md     |
| Comprehensive guide | TUTORIAL.md        |
| API endpoints       | API_REFERENCE.md   |
| Database schema     | DATABASE_SCHEMA.md |
| Coding practices    | DEVELOPMENT.md     |
| Design system       | design.md          |
| This reference      | QUICK_REFERENCE.md |
| Navigation          | INDEX.md           |

---

**💡 Tip: Bookmark this page and the INDEX.md file!**

**Last Updated:** 2026-08-26

**Questions? Check INDEX.md for complete guidance.**
