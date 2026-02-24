import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (use analytics Supabase project)"
  );
}

export const supabase = createClient(url, anonKey);

export type ProviderSpendingRow = {
  id: number;
  billing_provider_npi_num: string | null;
  servicing_provider_npi_num: string | null;
  hcpcs_code: string | null;
  claim_from_month: string | null;
  total_unique_beneficiaries: string | null;
  total_claims: string | null;
  total_paid: string | null;
};
