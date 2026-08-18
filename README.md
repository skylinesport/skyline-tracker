# Skyline Launch Tracker

A simple, visual project tracker for shipping Skylinesport — a Kanban board with
live progress stats. Your whole team edits it and changes sync instantly. Built
with **Next.js** (hosted free on **Vercel**) + **Supabase** (free shared database).

- Board columns: **To Do → In Progress → Blocked → Done**
- Live stats: overall %, launch-blockers (P0) left, progress per area
- Add / edit / delete tasks; move a task by changing its status
- Open link: anyone with the URL can view **and** edit (keep the URL private)

---

## 1. Create the database (Supabase — free, ~2 min)

1. Sign up at **https://supabase.com** → **New project** (pick any name / region; save the DB password).
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**. This creates the `tasks` table, opens it for the app, turns on live updates, and seeds it with the current Skyline status.
3. Open **Project Settings → API** and copy two values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The anon key is meant to be public (it ships in the browser). Access is controlled by the table policies in the SQL above.

## 2. Run it locally (optional)

```bash
npm install
cp .env.local.example .env.local   # then paste your two values into .env.local
npm run dev                        # http://localhost:3000
```

## 3. Deploy on Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to **https://vercel.com** → **Add New… → Project** → import that repo.
3. In **Environment Variables**, add the same two:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy.** You get a `https://your-tracker.vercel.app` URL. Share it with your team.

That's it — every teammate who opens the link sees the live board and can update it.

## Customizing

- Tasks are just rows in the `tasks` table — add/edit/delete from the app, or in Supabase's Table Editor.
- Columns/areas/priorities live at the top of [`app/page.js`](./app/page.js) (`STATUSES`, `AREAS`, `PRIORITIES`).
- Colors/branding are in [`app/globals.css`](./app/globals.css) (`--lime`, etc.).

## Notes

- **Open editing**: anyone with the URL can edit. To lock editing to signed-in
  teammates later, add Supabase Auth and tighten the table policies.
- Free tiers are plenty for a team tracker (Vercel hobby + Supabase free).
