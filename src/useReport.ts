import { useQuery } from '@tanstack/react-query';
import type { BusinessNode } from './data';
import { dateKey, type ReportDetail, type ReportRange } from './reportPeriod';

export function useReport(range: ReportRange, detail: ReportDetail) {
  const from = dateKey(range.from);
  const to = dateKey(range.to);
  return useQuery({
    queryKey: ['report', from, to, detail],
    queryFn: async ({ signal }): Promise<BusinessNode> => {
      const response = await fetch(`/api/report?from=${from}&to=${to}&detail=${detail}`, { signal });
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('id' in payload) || !('values' in payload) || !Array.isArray(payload.values)) {
        throw new Error('The server returned an invalid report.');
      }
      return payload as BusinessNode;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
