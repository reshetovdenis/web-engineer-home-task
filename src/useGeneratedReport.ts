import { useQuery } from '@tanstack/react-query';
import { createReport } from '../server/report.js';
import type { BusinessNode } from './data';
import { dateKey, type ReportDetail, type ReportRange } from './reportPeriod';

export interface GeneratedReport {
  root: BusinessNode;
  labels: string[];
  generated: boolean;
}

export function useGeneratedReport(range: ReportRange, detail: ReportDetail, enabled: boolean, source?: BusinessNode) {
  const from = dateKey(range.from);
  const to = dateKey(range.to);
  return useQuery({
    queryKey: ['report', from, to, detail],
    enabled,
    queryFn: async ({ signal }): Promise<GeneratedReport> => {
      const response = await fetch(`/api/report?from=${from}&to=${to}&detail=${detail}`, { signal });
      if (response.status === 404 && source) return createReport(source, from, to, detail);
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      return response.json() as Promise<GeneratedReport>;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
