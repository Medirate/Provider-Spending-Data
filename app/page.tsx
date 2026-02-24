import { supabase, isSupabaseConfigured, type ProviderSpendingRow } from "@/lib/supabase";
import Link from "next/link";

const PAGE_SIZE = 50;

type SearchParams = { page?: string; month?: string; hcpcs?: string; npi?: string };

async function getFilterOptions() {
  try {
    const [monthsRes, hcpcsRes] = await Promise.all([
      supabase
        .from("provider_spending")
        .select("claim_from_month")
        .not("claim_from_month", "is", null)
        .order("id", { ascending: false })
        .limit(2000),
      supabase
        .from("provider_spending")
        .select("hcpcs_code")
        .not("hcpcs_code", "is", null)
        .order("id", { ascending: true })
        .limit(2000),
    ]);
    const months = monthsRes.data
      ? [...new Set(monthsRes.data.map((x) => x.claim_from_month).filter(Boolean))].sort().reverse() as string[]
      : [];
    const hcpcsCodes = hcpcsRes.data
      ? [...new Set(hcpcsRes.data.map((x) => x.hcpcs_code).filter(Boolean))].sort() as string[]
      : [];
    return { months, hcpcsCodes };
  } catch {
    return { months: [], hcpcsCodes: [] };
  }
}

async function getData(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE; // fetch one extra to detect next page (avoids expensive count)

  let q = supabase
    .from("provider_spending")
    .select("id, billing_provider_npi_num, servicing_provider_npi_num, hcpcs_code, claim_from_month, total_unique_beneficiaries, total_claims, total_paid")
    .order("id", { ascending: true })
    .range(from, to);

  if (params.month) {
    q = q.eq("claim_from_month", params.month);
  }
  if (params.hcpcs) {
    q = q.eq("hcpcs_code", params.hcpcs);
  }
  if (params.npi?.trim()) {
    q = q.ilike("billing_provider_npi_num", `%${params.npi.trim()}%`);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(error.message);
  }
  const all = (data ?? []) as ProviderSpendingRow[];
  const hasNext = all.length > PAGE_SIZE;
  const rows = hasNext ? all.slice(0, PAGE_SIZE) : all;
  return {
    rows,
    page,
    hasNext,
    hasPrev: page > 1,
  };
}

function buildQuery(params: SearchParams, overrides: Partial<SearchParams> = {}) {
  const p = new URLSearchParams();
  const merged = { ...params, ...overrides };
  if (merged.page && merged.page !== "1") p.set("page", merged.page);
  if (merged.month) p.set("month", merged.month);
  if (merged.hcpcs) p.set("hcpcs", merged.hcpcs);
  if (merged.npi) p.set("npi", merged.npi);
  return p.toString() ? `?${p.toString()}` : "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
          <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Configuration needed
          </h1>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Set <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your
            environment (e.g. Vercel project settings) and redeploy.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const [filterOptions, data] = await Promise.all([
    getFilterOptions(),
    getData(params),
  ]);

  const query = (overrides: Partial<SearchParams>) =>
    buildQuery(params, overrides);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Provider Spending Dashboard</h1>
          <Link
            href="/drug-spending"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            Medicaid drug spending →
          </Link>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Medicaid provider spending data • Page {data.page}
        </p>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto">
        <form
          method="get"
          className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Claim month</span>
            <select
              name="month"
              defaultValue={params.month ?? ""}
              className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">All</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">HCPCS code</span>
            <select
              name="hcpcs"
              defaultValue={params.hcpcs ?? ""}
              className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="">All</option>
              {filterOptions.hcpcsCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Billing NPI (contains)</span>
            <input
              type="text"
              name="npi"
              defaultValue={params.npi ?? ""}
              placeholder="e.g. 1376609297"
              className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm w-40"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Apply
          </button>
          <Link
            href="/"
            className="rounded border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        </form>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50">
                  <th className="text-left p-3 font-medium">Billing NPI</th>
                  <th className="text-left p-3 font-medium">Servicing NPI</th>
                  <th className="text-left p-3 font-medium">HCPCS</th>
                  <th className="text-left p-3 font-medium">Month</th>
                  <th className="text-right p-3 font-medium">Beneficiaries</th>
                  <th className="text-right p-3 font-medium">Claims</th>
                  <th className="text-right p-3 font-medium">Total paid</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No rows match the current filters.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="p-3 font-mono">{row.billing_provider_npi_num ?? "—"}</td>
                      <td className="p-3 font-mono">{row.servicing_provider_npi_num ?? "—"}</td>
                      <td className="p-3">{row.hcpcs_code ?? "—"}</td>
                      <td className="p-3">{row.claim_from_month ?? "—"}</td>
                      <td className="p-3 text-right tabular-nums">
                        {row.total_unique_beneficiaries ?? "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {row.total_claims ?? "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {row.total_paid != null
                          ? Number(row.total_paid).toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(data.hasPrev || data.hasNext) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <span className="text-sm text-zinc-500">
                Page {data.page}
              </span>
              <div className="flex gap-2">
                {data.hasPrev && (
                  <Link
                    href={query({ page: String(data.page - 1) })}
                    className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {data.hasNext && (
                  <Link
                    href={query({ page: String(data.page + 1) })}
                    className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
