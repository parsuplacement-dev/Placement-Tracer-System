# Quick Start Guide – Placement Tracer System

Get up and running in **10 minutes**.

## 1. Install Dependencies (1 min)

```bash
cd tracer-system
npm ci
```

## 2. Set Up Environment (2 min)

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# Google Drive
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-drive-folder-id
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## 3. Run Migrations (2 min)

```bash
npx supabase db push
```

## 4. Start Development Server (1 min)

```bash
npm run dev
```

Visit http://localhost:3000

## 5. Test Setup (2 min)

```bash
npm test
npm run lint
```

## 6. First Run Checklist

- [ ] Can sign in with Google (@parsu.edu.ph email)
- [ ] Dashboard shows correctly
- [ ] Database connection working
- [ ] No console errors

---

## Common Commands

| Command                | Purpose                  |
| ---------------------- | ------------------------ |
| `npm run dev`          | Start development server |
| `npm run build`        | Production build         |
| `npm start`            | Run production build     |
| `npm test`             | Run tests                |
| `npm run lint`         | Check code quality       |
| `npm run format`       | Format code              |
| `npx supabase db push` | Run migrations           |

---

## Next Steps

1. Read [TUTORIAL.md](TUTORIAL.md) for full documentation
2. Review [design.md](design.md) for UI guidelines
3. Check [API_REFERENCE.md](API_REFERENCE.md) for endpoints
4. Start modifying components in `app/` and `components/`

---

## Stuck?

- Check [TUTORIAL.md#troubleshooting](TUTORIAL.md#troubleshooting)
- Review error logs: `npm run dev` and check terminal
- Verify environment variables
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`
