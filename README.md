# Provider Spending Data

Medicaid provider spending data tools and dashboard.

- **`dashboard/`** — Next.js app for browsing the data (deploy to [Vercel](https://vercel.com)). Connects to the analytics Supabase project.
- **`import-provider-spending.mjs`** — Script to load CSV parts into Supabase `provider_spending` (run locally with `DATABASE_URL` and optional `RESUME_AFTER`).

## Deploying the dashboard on Vercel

1. Import this repo in Vercel and set **Root Directory** to `dashboard`.
2. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` — analytics Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — analytics Supabase anon key
3. Deploy.

See `dashboard/README.md` for local setup.
