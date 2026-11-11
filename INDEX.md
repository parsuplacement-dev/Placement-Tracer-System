# Documentation Index – Placement Tracer System

**Version:** 1.0 | **Last Updated:** 2026-08-26

---

## 📚 Documentation Files

### Quick Setup

- **[QUICK_START.md](QUICK_START.md)** – Get running in 10 minutes
  - Install, configure, migrate, start dev server

### For Developers

- **[GUIDE.md](GUIDE.md)** – Complete developer guide (3000+ lines)
  - Architecture, database, auth, workflows, coding patterns, deployment, troubleshooting
  - Replaces: TUTORIAL + DEVELOPMENT + DATABASE_SCHEMA

- **[REFERENCE.md](REFERENCE.md)** – API & database quick reference
  - All API endpoints with examples
  - Database tables and schemas
  - Quick lookups

- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** – Cheat sheet (printable)
  - Commands, patterns, common problems

### For Everyone

- **[PRESENTATION.md](PRESENTATION.md)** – How to use the app
  - Non-technical guide for users
  - What the system does
  - How to perform tasks
  - Screenshots and walkthroughs

### Reference Files (Already in repo)

- **[README.md](README.md)** – Project overview
- **[design.md](design.md)** – UI/UX design system

---

## 🗂️ Project Structure Quick Reference

```
tracer-system/
├── 📄 Documentation
│   ├── QUICK_START.md              ← Start here (10 min)
│   ├── TUTORIAL.md                 ← Complete guide (comprehensive)
│   ├── API_REFERENCE.md            ← API endpoints
│   ├── DATABASE_SCHEMA.md          ← Database structure
│   ├── DEVELOPMENT.md              ← Dev practices
│   ├── README.md                   ← Project overview
│   └── design.md                   ← UI/UX design system
│
├── 📱 Frontend (app/)
│   ├── (auth)/signin               ← Google OAuth sign-in
│   └── (protected)/                ← Authenticated routes
│       ├── page.tsx                ← Alumni dashboard
│       ├── admin/                  ← Admin pages
│       │   ├── accounts/           ← User management
│       │   ├── studies/            ← Study management
│       │   ├── responses/          ← Response admin
│       │   └── files/              ← Drive file browser
│       └── api/                    ← Route handlers (API)
│
├── 🧩 Components (components/)
│   ├── ui/                         ← Primitives
│   ├── forms/                      ← Form-specific
│   ├── admin/                      ← Admin UI
│   ├── responses/                  ← Response display
│   ├── auth/                       ← Auth UI
│   └── layout/                     ← Navigation
│
├── ⚙️ Business Logic (lib/)
│   ├── auth/                       ← User verification
│   ├── repositories/               ← Database access
│   ├── forms/                      ← Validation
│   ├── google-drive/               ← Drive integration
│   ├── surveys/                    ← Study logic
│   ├── exports/                    ← Excel export
│   ├── programs/                   ← Org structure
│   └── ...
│
├── 📊 Database (supabase/)
│
└── ⚙️ Configuration
    ├── package.json                ← Dependencies
    ├── tsconfig.json               ← TypeScript
    ├── tailwind.config.ts          ← Styling
    └── .env.local                  ← Environment (local)
```

---

## 🎯 Learning Path

**Day 1 – Setup & Overview**

- [ ] Run QUICK_START.md (10 min)
- [ ] Verify local dev server running
- [ ] Browse UI at http://localhost:3000

**Day 2 – Data Model**

- [ ] Read TUTORIAL.md sections 5-6 (Database, Authentication)
- [ ] Study DATABASE_SCHEMA.md (domains 1-3)

**Day 3 – Workflows & API**

- [ ] Read TUTORIAL.md section 8 (Key Workflows)
- [ ] Study API_REFERENCE.md (endpoints overview)
- [ ] Trace one complete workflow (Alumni submits response)
- [ ] Play with API in browser DevTools Network tab

**Day 4 – Codebase Navigation**

- [ ] Study DEVELOPMENT.md (Project Structure)
- [ ] Explore app/ directory structure
- [ ] Locate key files for a feature

**Day 5 – Components & Styling**

- [ ] Read TUTORIAL.md section 9 (Component Structure)
- [ ] Review design.md (UI/UX design)
- [ ] Examine components/ui/ primitives
- [ ] Study Tailwind CSS semantic tokens

### Week 2: Development

**Day 6-7 – Hands-On Development**

- [ ] Make a small UI change (button text, color)
- [ ] Run tests: `npm test`
- [ ] Create a simple component

**Day 8-9 – Database & Logic**

- [ ] Read a form response from database
- [ ] Add validation with Zod
- [ ] Test endpoint in Postman/curl

- [ ] Build for production: `npm run build`
- [ ] Review deployment checklist in TUTORIAL.md
- [ ] Understand environment variable setup
- [ ] Practice deploying to staging

## 🔑 Key Concepts

### Authentication Flow

```
User → Google OAuth → Supabase Auth → JWT Cookie → Verified Session
```

→ Reference: TUTORIAL.md #Authentication-Flow

### Authorization Model

```
Role (admin/coordinator/alumni)
  + Coordinator Grants (program scope)
  = Fine-grained access control
```

→ Reference: TUTORIAL.md #Authorization-Model

### Main Data Flow

```
Form Version → Study → Form Responses → Upload Documents → Export
```

→ Reference: DATABASE_SCHEMA.md

### API Architecture

```
Route Handler (auth check)
  → Repository (query + authorization)
    → Supabase API (RLS policies)
      → PostgreSQL (database)
```

→ Reference: API_REFERENCE.md + DEVELOPMENT.md

---

## 💡 Quick Lookup

### "How do I..."

#### ...add a new form field?

1. Update form schema in `lib/forms/validation.ts`
2. Add UI component in `components/forms/GraduateTracerForm.tsx`
3. Add database migration if storing new field
   → See DEVELOPMENT.md #Form-Validation-Patterns

#### ...create a new admin page?

1. Create folder in `app/(protected)/admin/[feature]/`
2. Add `page.tsx` server component
3. Query data from `lib/repositories/`
4. Render UI from `components/admin/[feature]/`
5. Add route handler in `app/api/admin/[feature]/`
   → See DEVELOPMENT.md #Project-Structure

#### ...add user authorization?

1. Call `getCurrentUser()` in page/API
2. Check role with `requireRole()` or `isAdmin()`
3. Check program access with `canAccessProgram()`
   → See TUTORIAL.md #Protection-Patterns

#### ...export data to Excel?

1. Query data with filters
2. Format with `ExcelJS` in `lib/exports/`
3. Protect cells from formula injection
4. Log audit event
5. Return to user
   → See API_REFERENCE.md #GET-admin-responses-export

#### ...upload file to Google Drive?

1. Use resumable upload in `lib/google-drive/upload.ts`
2. Track status in `form_response_documents`
3. Organize after upload complete
   → See TUTORIAL.md #Google-Drive-Layout

#### ...debug a failing test?

1. Run: `npm test -- --grep "test name"`
2. Add `console.log()` statements
3. Check error message in output
4. Review test file and implementation
   → See DEVELOPMENT.md #Debugging-Tips

#### ...deploy to production?

1. Review TUTORIAL.md #Deployment checklist
2. Set environment variables in platform
3. Run: `npm run build && npm start`
4. Monitor logs for errors
   → See TUTORIAL.md #Deployment

#### ...find where a component is used?

1. Use VS Code "Find References": Shift+F12
2. Or search: Ctrl+Shift+F for import statements
3. Trace through component hierarchy
   → See DEVELOPMENT.md #Debugging-Tips

#### ...understand the role system?

1. Read TUTORIAL.md #Roles-and-Access
2. Review `lib/auth/roles.ts`
3. Check `lib/programs/catalog.ts` for org structure
4. Study DATABASE_SCHEMA.md #auth_accounts
   → See TUTORIAL.md #Authorization-Model

---

## 🚀 Development Workflow

### Daily Development Loop

```bash
# 1. Start development server
npm run dev

# 2. Edit code in VS Code

# 3. Test in browser
# Open http://localhost:3000

# 4. Before committing
npm run lint
npm run format
npm test

# 5. Build for production
npm run build

# 6. Deploy (if needed)
# Follow TUTORIAL.md #Deployment
```

### Adding a Feature

```bash
# 1. Create task branch
git checkout -b feature/description

# 2. Make changes to:
#    - Backend: lib/repositories, app/api
#    - Frontend: components, app/(protected)
#    - Database: supabase/migrations (if schema change)

# 3. Test
npm test
npm run lint

# 4. Commit
git add .
git commit -m "feat: description"

# 5. Push and create PR
git push origin feature/description

# 6. After review, merge to main
```

---

## 📋 Checklist for New Developer Handoff

### Environment Setup

- [ ] Node.js 20.9+ installed
- [ ] npm latest version

### Initial Verification

- [ ] `npm ci` succeeds
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3000 loads
- [ ] Can see database in Supabase dashboard
- [ ] Can authenticate with Google (test account)

### Knowledge Verification

- [ ] Can explain project purpose and stakeholders
- [ ] Can describe role-based access control
- [ ] Can identify key files for main features
- [ ] Can run and fix failing tests
- [ ] Can explain authentication flow
- [ ] Can describe data model (5 domains)
- [ ] Can navigate API documentation

### Hands-On Tasks

- [ ] Made a UI change successfully
- [ ] Fixed a linting error
- [ ] Added a simple component
- [ ] Ran all tests successfully
- [ ] Built production version
- [ ] Deployed to staging (or understanding deployment)

---

## 📞 When You Need Help

### "The app won't start"

→ Check: `.env.local` exists and complete | Node version | npm ci | Database connection
→ Read: QUICK_START.md or TUTORIAL.md #Troubleshooting

### "I don't understand the auth flow"

→ Read: TUTORIAL.md #Authentication--Authorization
→ Trace: lib/auth/ files | app/(auth)/signin/

### "How do I build a new feature?"

→ Read: DEVELOPMENT.md #Project-Structure
→ Follow: Development Workflow section above
→ Reference: API_REFERENCE.md for endpoints

### "A test is failing"

→ Run: `npm test -- --grep "test name"`
→ Read: DEVELOPMENT.md #Testing-Guidelines
→ Check: DEVELOPMENT.md #Debugging-Tips

### "I want to understand the database"

→ Read: DATABASE_SCHEMA.md (complete reference)
→ Explore: supabase/migrations/ (see schema history)
→ Play: Supabase dashboard → Database browser

### "How do I make changes to authorization?"

→ Read: TUTORIAL.md #Authorization-Model
→ Files: lib/auth/roles.ts | lib/programs/catalog.ts
→ Test: Run test suite to verify changes

---

## 🎓 External Resources

### Official Documentation

- **Next.js 16:** https://nextjs.org/docs (App Router, API Routes)
- **React 19:** https://react.dev (Components, Hooks)
- **TypeScript:** https://www.typescriptlang.org/docs
- **Tailwind CSS 4:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs (Auth, Database)
- **Zod:** https://zod.dev (Schema validation)

### Useful Learning Resources

- **Next.js App Router Tutorial:** https://nextjs.org/learn/dashboard-app
- **React Server Components:** https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Google Drive API:** https://developers.google.com/drive/api

---

## 📈 System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER                                                │
│  • React 19 + TypeScript                                │
│  • Tailwind CSS styling                                 │
│  • Forms: React Hook Form + Zod validation              │
└────────────────────────────┬────────────────────────────┘
                             │
                    HTTPS + HTTP-only JWT Cookie
                             │
                             ↓
┌─────────────────────────────────────────────────────────┐
│  NEXT.JS 16 SERVER                                      │
│  • App Router routing                                   │
│  • Server Components (default)                          │
│  • API Route Handlers                                   │
│  • Authorization checks on every request                │
└────────┬────────────────────────────┬────────────────────┘
         │                            │
    ┌────↓─────┐            ┌────────↓────────┐
    │ SUPABASE │            │ GOOGLE DRIVE    │
    │           │            │                 │
    │ • Auth   │            │ • File storage  │
    │ • DB     │            │ • Hierarchy     │
    │ • RLS    │            │ • Resumable     │
    │          │            │   uploads       │
    └──────────┘            └─────────────────┘
```

---

## 📊 Metrics & Monitoring

### Health Checks

```bash
# Application health
npm run build              # Should succeed
npm test                  # All tests pass
npm run lint              # No errors

# Database health
# → Check Supabase dashboard status
# → Verify PostgreSQL connection

# Deployment health
# → Check production URL
# → Monitor error logs
# → Verify response times
```

---

## 🔄 Version History

| Version | Date       | Notes                          |
| ------- | ---------- | ------------------------------ |
| 1.0     | 2026-08-26 | Initial complete documentation |

---

## 📝 Notes & Custom Info

**This section is for team-specific notes:**

### Your Team

- **Product Owner:** [Name]
- **Tech Lead:** [Name]
- **Contributors:** [Names]

### Important Contacts

- **ParSU Placement Unit:** [Contact]
- **Technical Support:** [Email/Slack]
- **Security Issues:** [Email]

### Special Configurations

- **ParSU Domain:** @parsu.edu.ph
- **Org Structure:** See `lib/programs/catalog.ts`
- **Drive Root Folder:** (In `.env.local`)
- **Supabase Project:** (In `.env.local`)

### Known Limitations

- (Add any known issues here)

### Future Roadmap

- (Add planned features)

---

## ✅ Sign-Off Checklist

**New Developer Onboarding Verification**

Developer Name: ________________ Date: ________________

- [ ] All documentation read and understood
- [ ] Local development environment working
- [ ] Can run tests successfully
- [ ] Can explain role-based access control
- [ ] Can identify main components and workflows
- [ ] Can make a simple code change
- [ ] Questions answered by tech lead

**Approved by:** ________________ Date: ________________

---

**📌 Keep this as your reference guide. Bookmark the sections you use most.**

**Last Updated:** 2026-08-26 | Maintained by: Placement Unit Development Team
