const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface ReportCountResult {
  count: number;
  limit: number;
  isExportable: boolean;
}

export async function checkReportCount(
  type: string,
  params?: Record<string, string | undefined>,
): Promise<ReportCountResult> {
  const searchParams = new URLSearchParams({ type });
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(`${BASE}/reports/count?${searchParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to check report count: ${res.statusText}`);
  }

  const data = await res.json();
  return data as ReportCountResult;
}
