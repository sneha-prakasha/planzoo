# PlanZoo - Project Management & Team Collaboration Platform

A full-stack app where teams create projects, invite members, and manage tasks on a live kanban board.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI components · Supabase (Postgres + Auth + Realtime + Row Level Security) · Resend (invite emails) · Vercel

## Features

- Sidebar app layout with global task search (works on mobile with a slide-out menu)
- Email/password sign up and login (Supabase Auth)
- Dashboard: stats, task completion chart, workload balance per person, my upcoming deadlines, project progress, recent activity
- Projects page with progress and team avatars; project colors
- Project page tabs: Overview, Board, List, Members
- Kanban board: To do / In progress / In review / Done, drag and drop, live updates between teammates
- Task details: description, priority, assignee, due date, overdue highlighting, comments
- My tasks page: everything assigned to you, filtered by open / overdue / done
- Team page: everyone across your projects with their workload
- Activity feed per project and on the dashboard (created, moved, assigned, commented)
- Invite teammates by email (existing users are added instantly, new users join when they sign up)
- Security: every table uses Row Level Security, so users only see projects they belong to

## Upgrading from the first version

Run `supabase/migration-v2.sql` once in Supabase -> SQL Editor (Supabase will warn about "destructive operations" because it drops one constraint and re-creates it; that is expected). It adds the "In review" status, project colors and the activity feed. Then redeploy. Existing data is kept.

## Setup (about 15 minutes)

### 1. Create the database (Supabase)

1. Go to https://supabase.com, create a free project, and wait for it to finish starting.
2. Open **SQL Editor -> New query**, paste the entire contents of `supabase/schema.sql`, click **Run**, then do the same with `supabase/migration-v2.sql`.
   (If the last line complains the table is "already member of publication", ignore it.)
3. For a quick demo, turn off email confirmation: **Authentication -> Sign In / Providers -> Email -> turn off "Confirm email"**.
   (Leave it on for production and users will confirm by email.)
4. Open **Project Settings -> API** and copy the **Project URL** and the **anon public key**.

### 2. Run locally

```bash
cp .env.example .env.local
# open .env.local and paste your Supabase URL and anon key
npm install
npm run dev
```

Open http://localhost:3000.

### 3. Test it end to end

1. Sign up with your email and a password.
2. Create a project, add a few tasks, drag them between columns.
3. Open a task, set assignee/due date, add a comment.
4. Members tab -> invite a second email. Sign up with that email in a private window and the project appears on their dashboard. Move a task in one window and watch it update in the other.

### 4. Deploy to Vercel

```bash
git init
git add .
git commit -m "PlanZoo"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR-USERNAME/planzoo.git
git branch -M main
git push -u origin main
```

1. Go to https://vercel.com -> **Add New -> Project** -> import the repo.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL, you can add it after the first deploy and redeploy)
   - `RESEND_API_KEY` and `RESEND_FROM` (optional, see below)
3. Click **Deploy**.
4. In Supabase go to **Authentication -> URL Configuration** and set **Site URL** to your Vercel URL (needed for email confirmation links if you keep confirmation on).

### 5. Invite emails with Resend (optional)

Without a Resend key everything still works; invited people just join when they sign up.

1. Create a free account at https://resend.com and make an API key.
2. Add `RESEND_API_KEY` to `.env.local` and to Vercel.
3. The default sender `onboarding@resend.dev` can only email your own Resend account address. To email anyone, verify a domain in Resend and set `RESEND_FROM="TaskFlow <hello@yourdomain.com>"`.

## Project structure

```
supabase/schema.sql          database tables, RLS policies, triggers, invite function
src/app/page.tsx             landing page
src/app/login/page.tsx       sign up / log in
src/app/dashboard/page.tsx   stats + project list
src/app/projects/[id]/       project page (board + members tabs)
src/app/api/invite/route.ts  invite API (server side, sends email)
src/components/Board.tsx     kanban board with drag and drop + realtime
src/components/TaskModal.tsx task editing + comments
src/components/Members.tsx   team management and invites
src/components/ui.tsx        Button, Input, Modal, etc.
```

## Troubleshooting

- **"Supabase is not configured" on the login page:** your `.env.local` is missing or the dev server was not restarted after editing it.
- **"new row violates row-level security policy":** the SQL file was not fully run. Re-run `supabase/schema.sql` on a fresh project.
- **Sign up says "Check your email" but nothing arrives:** turn off "Confirm email" (step 1.3) or configure custom SMTP in Supabase.
- **Board does not update live:** run the last line of `schema.sql` (`alter publication supabase_realtime add table public.tasks;`).

## Ideas to extend

- Expo / React Native mobile app using the same Supabase project
- Razorpay billing for a Pro plan
- Cloudflare in front of your custom domain
- File attachments (Supabase Storage), activity log, email notifications for assigned tasks
