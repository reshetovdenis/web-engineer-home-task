import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BusinessNode as ReportNode } from './data';
import { fullReportRange } from './reportPeriod';
import { reportQueryKey, useLoadReportChildren, useReport } from './useReport';
import { toBusinessNode, type Company } from './viewModel';

const values = Array(12).fill(10);

function employee(index: number): ReportNode {
  return {
    id: `employee-${index}`,
    name: `Employee ${index}`,
    values,
    hasChildren: false,
    childCount: 0,
    childrenLoaded: true,
  };
}

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('report queries', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads child pages with increasing offsets, appends them, and stops after the final partial page', async () => {
    const queryClient = new QueryClient();
    const initial = toBusinessNode({
      id: 'company',
      name: 'Company',
      values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'branch',
        name: 'Branch',
        values,
        hasChildren: true,
        childCount: 120,
        childrenLoaded: false,
      }],
    });
    queryClient.setQueryData(reportQueryKey(fullReportRange, 'month'), initial);

    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(String(input), 'http://localhost');
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      const pageLength = Math.min(limit, 120 - offset);
      return {
        ok: true,
        json: async () => ({
          id: 'branch',
          name: 'Branch',
          values,
          hasChildren: true,
          childCount: 120,
          childrenLoaded: offset + pageLength >= 120,
          employees: Array.from({ length: pageLength }, (_, index) => employee(offset + index + 1)),
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useLoadReportChildren(fullReportRange, 'month'),
      { wrapper: wrapper(queryClient) },
    );

    const currentBranch = () => queryClient.getQueryData<Company>(reportQueryKey(fullReportRange, 'month'))!.branches[0];

    await act(async () => result.current(currentBranch()));
    expect(currentBranch().employees).toHaveLength(50);
    expect(currentBranch().childrenLoaded).toBe(false);

    await act(async () => result.current(currentBranch()));
    expect(currentBranch().employees).toHaveLength(100);
    expect(currentBranch().childrenLoaded).toBe(false);

    await act(async () => result.current(currentBranch()));
    expect(currentBranch().employees).toHaveLength(120);
    expect(currentBranch().childrenLoaded).toBe(true);

    await act(async () => result.current(currentBranch()));
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const requests = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost'));
    expect(requests.map(url => url.searchParams.get('offset'))).toEqual(['0', '50', '100']);
    expect(requests.map(url => url.searchParams.get('limit'))).toEqual(['50', '50', '50']);
  });


  it('preserves already loaded children when a later page fails and can retry that page', async () => {
    const queryClient = new QueryClient();
    const initial = toBusinessNode({
      id: 'company',
      name: 'Company',
      values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'branch',
        name: 'Branch',
        values,
        hasChildren: true,
        childCount: 60,
        childrenLoaded: false,
      }],
    });
    queryClient.setQueryData(reportQueryKey(fullReportRange, 'month'), initial);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'branch', name: 'Branch', values, hasChildren: true, childCount: 60, childrenLoaded: false,
          employees: Array.from({ length: 50 }, (_, index) => employee(index + 1)),
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'branch', name: 'Branch', values, hasChildren: true, childCount: 60, childrenLoaded: true,
          employees: Array.from({ length: 10 }, (_, index) => employee(index + 51)),
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useLoadReportChildren(fullReportRange, 'month'),
      { wrapper: wrapper(queryClient) },
    );
    const currentBranch = () => queryClient.getQueryData<Company>(reportQueryKey(fullReportRange, 'month'))!.branches[0];

    await act(async () => result.current(currentBranch()));
    expect(currentBranch().employees).toHaveLength(50);

    await expect(act(async () => result.current(currentBranch()))).rejects.toThrow('The server returned 503.');
    expect(currentBranch().employees).toHaveLength(50);
    expect(currentBranch().childrenLoaded).toBe(false);

    await act(async () => result.current(currentBranch()));
    expect(currentBranch().employees).toHaveLength(60);
    expect(currentBranch().childrenLoaded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects malformed report payloads before they reach the view model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'company', name: 'Company', values: [10, 'bad-value'] }),
    }));
    const queryClient = new QueryClient();

    const { result } = renderHook(
      () => useReport(fullReportRange, 'month'),
      { wrapper: wrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('The server returned an invalid report.');
  });
});
