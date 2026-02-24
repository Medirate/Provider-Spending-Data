# Provider Spending Dashboard

Next.js app (Vercel-ready) that reads from the **analytics** Supabase project and shows provider spending data with filters and pagination.

## Setup

1. **Env for the analytics Supabase project**

   In the [analytics project](https://supabase.com/dashboard/project/vukbrknueixwmhvqetjy/settings/api) copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Create `dashboard/.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://vukbrknueixwmhvqetjy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key>
   ```

2. **Run locally**

   ```bash
   cd dashboard
   pnpm install
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

3. **Deploy to Vercel**

   - Import the repo (or this folder) in Vercel.
   - Add the same env vars in Project → Settings → Environment Variables.
   - Deploy.

## Data

- Table: `provider_spending` in the analytics Supabase project.
- Filters: claim month, HCPCS code, billing NPI (contains).
- Pagination: 50 rows per page.
