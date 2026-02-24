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
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function DrugSpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let rows: CmsDrugSpendingRow[] = [];
  let error: string | null = null;
  try {
    rows = await fetchCmsMedicaidDrugSpending({ size: PAGE_SIZE + 1, offset });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const hasNext = rows.length > PAGE_SIZE;
  const data = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Medicaid Spending by Drug</h1>
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
          </a>{" "}
          • Page {page}
        </p>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200 mb-6">
            {error}
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
                        {row.Chg_Avg_Spnd_Per_Dsg_Unt_22_23 != null
                          ? `${(parseFloat(row.Chg_Avg_Spnd_Per_Dsg_Unt_22_23) * 100).toFixed(1)}%`
                          : "—"}
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
                    href={page === 2 ? "/drug-spending" : `/drug-spending?page=${page - 1}`}
                    className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {hasNext && (
                  <Link
                    href={`/drug-spending?page=${page + 1}`}
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
