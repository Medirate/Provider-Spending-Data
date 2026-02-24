# Provider Spending Dashboard

Next.js app for browsing Medicaid provider spending data. Deploy to [Vercel](https://vercel.com); no Root Directory change needed.

## Setup

1. **Environment variables** (Vercel or `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` — analytics Supabase project URL (e.g. `https://vukbrknueixwmhvqetjy.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — analytics Supabase anon key

2. **Local dev**
   ```bash
   pnpm install
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

3. **Deploy on Vercel**  
   Import the repo and add the two env vars. Build command and output are detected automatically.

## Optional: CSV import script

To load CSV data into the analytics Supabase project (run locally only):

```bash
# From repo root, with DATABASE_URL and optional RESUME_AFTER in .env
node scripts/import-provider-spending.mjs
```

Place CSV files in `medicaid-provider-spending_part258/` (or set path in the script). Requires `pg` and `pg-copy-streams`; install with `pnpm add -D pg pg-copy-streams` if needed.
