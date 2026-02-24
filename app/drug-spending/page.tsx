import { fetchCmsMedicaidDrugSpending, type CmsDrugSpendingRow } from "@/lib/cms-api";
import Link from "next/link";

const PAGE_SIZE = 25;

function formatCurrency(value: string | undefined): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNum(value: string | undefined): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

function formatYoY(value: string | undefined): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function filterRows(rows: CmsDrugSpendingRow[], q: string): CmsDrugSpendingRow[] {
  const lower = q.trim().toLowerCase();
  if (!lower) return rows;
  return rows.filter(
    (r) =>
      (r.Brnd_Name ?? "").toLowerCase().includes(lower) ||
      (r.Gnrc_Name ?? "").toLowerCase().includes(lower) ||
      (r.Mftr_Name ?? "").toLowerCase().includes(lower)
  );
}

function buildQuery(overrides: { page?: number; q?: string }) {
  const p = new URLSearchParams();
  if (overrides.page != null && overrides.page !== 1) p.set("page", String(overrides.page));
  if (overrides.q) p.set("q", overrides.q);
  return p.toString() ? `?${p.toString()}` : "";
}

export default async function DrugSpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = (params.q ?? "").trim();

  let rows: CmsDrugSpendingRow[] = [];
  let error: string | null = null;
  let totalFiltered = 0;

  try {
    if (query) {
      const batch = await fetchCmsMedicaidDrugSpending({ size: 1500, offset: 0 });
      const filtered = filterRows(batch, query);
      totalFiltered = filtered.length;
      const start = (page - 1) * PAGE_SIZE;
      rows = filtered.slice(start, start + PAGE_SIZE + 1);
    } else {
      const offset = (page - 1) * PAGE_SIZE;
      rows = await fetchCmsMedicaidDrugSpending({ size: PAGE_SIZE + 1, offset });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const hasNext = query ? rows.length > PAGE_SIZE : rows.length > PAGE_SIZE;
  const data = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

  const pageTotalSpending2023 = data.reduce(
    (sum, r) => sum + (parseFloat(r.Tot_Spndng_2023) || 0),
    0
  );
  const pageAvgYoY =
    data.length > 0
      ? data.reduce((sum, r) => {
          const v = parseFloat(r.Chg_Avg_Spnd_Per_Dsg_Unt_22_23 ?? "");
          return sum + (Number.isNaN(v) ? 0 : v);
        }, 0) / data.length
      : 0;
  const top10 = [...data]
    .sort((a, b) => parseFloat(b.Tot_Spndng_2023) - parseFloat(a.Tot_Spndng_2023))
    .slice(0, 10);
  const maxSpend = top10[0] ? parseFloat(top10[0].Tot_Spndng_2023) || 1 : 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Medicaid Drug Spending Dashboard</h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            ← Provider spending
          </Link>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Source:{" "}
          <a
            href="https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicaid-spending-by-drug"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            data.cms.gov
          </a>
          {query && (
            <>
              {" "}
              • Search: &quot;{query}&quot;
              {totalFiltered > 0 && ` (${totalFiltered} match${totalFiltered === 1 ? "" : "es"})`}
            </>
          )}
          {" • "}Page {page}
        </p>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search brand, generic, or manufacturer…"
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm w-72"
          />
          <button
            type="submit"
            className="rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
          {query && (
            <Link
              href="/drug-spending"
              className="rounded border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">This page · Spending 2023</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(String(pageTotalSpending2023))}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rows on page</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Avg YoY change (page)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatYoY(String(pageAvgYoY))}</p>
          </div>
        </div>

        {top10.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Top 10 by spending 2023 (this page)
            </h2>
            <div className="space-y-2">
              {top10.map((row, i) => {
                const spend = parseFloat(row.Tot_Spndng_2023) || 0;
                const pct = maxSpend > 0 ? (spend / maxSpend) * 100 : 0;
                return (
                  <div key={`${row.Brnd_Name}-${row.Mftr_Name}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className="w-32 truncate" title={row.Brnd_Name}>
                      {row.Brnd_Name ?? "—"}
                    </span>
                    <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 dark:bg-emerald-600 rounded min-w-[2px]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="tabular-nums w-24 text-right">{formatCurrency(row.Tot_Spndng_2023)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50">
                  <th className="text-left p-3 font-medium">Brand</th>
                  <th className="text-left p-3 font-medium">Generic</th>
                  <th className="text-left p-3 font-medium">Manufacturer</th>
                  <th className="text-right p-3 font-medium">Spending 2023</th>
                  <th className="text-right p-3 font-medium">Claims 2023</th>
                  <th className="text-right p-3 font-medium">Spending 2022</th>
                  <th className="text-right p-3 font-medium">YoY change (avg)</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && !error ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No rows.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr
                      key={`${row.Brnd_Name}-${row.Mftr_Name}-${i}`}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="p-3">{row.Brnd_Name ?? "—"}</td>
                      <td className="p-3 max-w-[200px] truncate" title={row.Gnrc_Name}>
                        {row.Gnrc_Name ?? "—"}
                      </td>
                      <td className="p-3">{row.Mftr_Name ?? "—"}</td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.Tot_Spndng_2023)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatNum(row.Tot_Clms_2023)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.Tot_Spndng_2022)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatYoY(row.Chg_Avg_Spnd_Per_Dsg_Unt_22_23)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <span className="text-sm text-zinc-500">Page {page}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/drug-spending${buildQuery({ page: page - 1, q: query || undefined })}`}
                    className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {hasNext && (
                  <Link
                    href={`/drug-spending${buildQuery({ page: page + 1, q: query || undefined })}`}
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
