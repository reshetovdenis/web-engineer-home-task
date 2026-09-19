import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BusinessNode as ReportNode } from './data';
import { dateKey, type ReportDetail, type ReportRange } from './reportPeriod';
import { appendBusinessNodePage, childrenOf, toBusinessNode, type BusinessNode, type Company } from './viewModel';

const staleTime = 5 * 60 * 1000;
export const childPageSize = 50;

export function reportQueryKey(range: ReportRange, detail: ReportDetail) {
  return ['report', dateKey(range.from), dateKey(range.to), detail] as const;
}

function isReportNode(payload: unknown): payload is ReportNode {
  if (!payload || typeof payload !== 'object') return false;
  const node = payload as Record<string, unknown>;
  if (typeof node.id !== 'string' || !node.id || typeof node.name !== 'string') return false;
  if (!Array.isArray(node.values) || !node.values.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return false;
  if (node.hasChildren !== undefined && typeof node.hasChildren !== 'boolean') return false;
  if (node.childrenLoaded !== undefined && typeof node.childrenLoaded !== 'boolean') return false;
  if (node.childCount !== undefined && (typeof node.childCount !== 'number' || !Number.isInteger(node.childCount) || node.childCount < 0)) return false;
  for (const key of ['branches', 'employees', 'channels'] as const) {
    const children = node[key];
    if (children !== undefined && (!Array.isArray(children) || !children.every(isReportNode))) return false;
  }
  return true;
}

function parsePayload(payload: unknown): ReportNode {
  if (!isReportNode(payload)) throw new Error('The server returned an invalid report.');
  return payload;
}

export function useReport(range: ReportRange, detail: ReportDetail) {
  const from = dateKey(range.from);
  const to = dateKey(range.to);
  return useQuery({
    queryKey: reportQueryKey(range, detail),
    queryFn: async ({ signal }): Promise<Company> => {
      const response = await fetch(`/api/report?from=${from}&to=${to}&detail=${detail}`, { signal });
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      return toBusinessNode(parsePayload(await response.json()));
    },
    staleTime,
    retry: false,
  });
}

export function useLoadReportChildren(range: ReportRange, detail: ReportDetail) {
  const queryClient = useQueryClient();
  const from = dateKey(range.from);
  const to = dateKey(range.to);
  return useCallback(async (node: BusinessNode) => {
    if (!node.hasChildren || node.childrenLoaded) return;

    const offset = childrenOf(node).length;
    const payload = await queryClient.fetchQuery({
      queryKey: ['report-children', from, to, detail, node.id, offset, childPageSize],
      queryFn: async ({ signal }): Promise<ReportNode> => {
        const params = new URLSearchParams({
          parentId: node.id,
          from,
          to,
          detail,
          offset: String(offset),
          limit: String(childPageSize),
        });
        const response = await fetch(`/api/report/children?${params}`, { signal });
        if (!response.ok) throw new Error(`The server returned ${response.status}.`);
        return parsePayload(await response.json());
      },
      staleTime,
      retry: false,
    });

    if (payload.id !== node.id) throw new Error('The server returned an invalid hierarchy node.');

    queryClient.setQueryData<Company>(['report', from, to, detail] as const, current =>
      current ? appendBusinessNodePage(current, node.id, payload) : current);
  }, [detail, from, queryClient, to]);
}
