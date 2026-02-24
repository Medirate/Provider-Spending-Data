/**
 * CMS Data API: Medicaid Spending by Drug
 * @see https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicaid-spending-by-drug
 * @see https://catalog.data.gov/dataset/medicaid-spending-by-drug-b6f77
 */
const CMS_DRUG_SPENDING_API =
  "https://data.cms.gov/data-api/v1/dataset/be64fce3-e835-4589-b46b-024198e524a6/data";

export type CmsDrugSpendingRow = {
  Brnd_Name: string;
  Gnrc_Name: string;
  Tot_Mftr: string;
  Mftr_Name: string;
  Tot_Spndng_2019: string;
  Tot_Spndng_2020: string;
  Tot_Spndng_2021: string;
  Tot_Spndng_2022: string;
  Tot_Spndng_2023: string;
  Tot_Clms_2019: string;
  Tot_Clms_2020: string;
  Tot_Clms_2021: string;
  Tot_Clms_2022: string;
  Tot_Clms_2023: string;
  Chg_Avg_Spnd_Per_Dsg_Unt_22_23?: string;
  CAGR_Avg_Spnd_Per_Dsg_Unt_19_23?: string;
  [key: string]: string | undefined;
};

export type CmsDrugSpendingParams = {
  size?: number;
  offset?: number;
};

export async function fetchCmsMedicaidDrugSpending(
  params: CmsDrugSpendingParams = {}
): Promise<CmsDrugSpendingRow[]> {
  const { size = 50, offset = 0 } = params;
  const url = new URL(CMS_DRUG_SPENDING_API);
  url.searchParams.set("size", String(size));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`CMS API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
