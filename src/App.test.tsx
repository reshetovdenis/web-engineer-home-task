import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import company from '../data/company.json';
import type { BusinessNode } from './data';
import { createReport } from '../server/report.ts';

function renderApp(queryClient = new QueryClient()) {
  return render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
}

function reportResponse(input: string) {
  const params = new URL(input, 'http://localhost').searchParams;
  return {
    ok: true,
    json: async () => createReport(
      company,
      params.get('from')!,
      params.get('to')!,
      params.get('detail') as 'year' | 'month' | 'day',
    ),
  };
}

describe('App request states', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a loading state while the request is pending', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );

    renderApp();

    expect(
      screen.getByRole('status')
    ).toHaveTextContent('Loading client data');
  });

  it('shows an error when the API request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    renderApp();

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent(
      'Couldn’t load client data: The server returned 500.'
    );

    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('retries after an error', async () => {
    const user = userEvent.setup();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => company,
      });

    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Try again' })
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(
      await screen.findByRole('img', {
        name: /stacked monthly client chart/i,
      })
    ).toBeInTheDocument();
  });

  it('loads the default report and reuses fresh cached data when mounted again', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => company,
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const first = renderApp(queryClient);
    await screen.findByRole('img', { name: /stacked monthly client chart/i });
    first.unmount();

    renderApp(queryClient);

    expect(screen.getByRole('img', { name: /stacked monthly client chart/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/report?from=2024-02-01&to=2025-01-31&detail=month');
  });

  it('loads year and day reports from the report endpoint', async () => {
    const user = userEvent.setup();
    function project(node: BusinessNode, groups: number[][]): BusinessNode {
      return {
        ...node,
        values: groups.map(indexes => indexes.reduce((sum, index) => sum + node.values[index], 0)),
        ...(node.branches && { branches: node.branches.map(child => project(child, groups)) }),
        ...(node.employees && { employees: node.employees.map(child => project(child, groups)) }),
        ...(node.channels && { channels: node.channels.map(child => project(child, groups)) }),
      };
    }
    const fetchMock = vi.fn(async (input: string) => {
      const detail = new URL(input, 'http://localhost').searchParams.get('detail');
      if (detail === 'month') return { ok: true, json: async () => company };
      const groups = detail === 'year' ? [Array.from({ length: 11 }, (_, index) => index), [11]] : Array.from({ length: 31 }, () => [11]);
      return { ok: true, json: async () => project(company, groups) };
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'year');
    expect(await screen.findByRole('img', { name: /stacked yearly client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2025' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    expect(await screen.findByRole('img', { name: /stacked daily client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Period: Feb 1, 2024 – Jan 31, 2025/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('detail=day'))).toBe(true);
  });

  it('shows an error when a selected report is unavailable', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string) => input.includes('detail=month')
      ? { ok: true, json: async () => company }
      : { ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'year');
    expect(await screen.findByRole('alert')).toHaveTextContent('The server returned 404.');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('detail=year'))).toBe(true);
  });

  it('selects a report period with DayPicker', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    expect(screen.getByRole('dialog', { name: 'Choose report period' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /February 15th, 2024/i }));
    await user.click(screen.getByRole('button', { name: /February 20th, 2024/i }));

    expect(screen.queryByRole('dialog', { name: 'Choose report period' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Period: Feb 15, 2024 – Feb 20, 2024/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Detail' })).toHaveValue('day');
    expect(await screen.findByRole('columnheader', { name: 'Feb 15' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feb 20' })).toBeInTheDocument();
  });

  it('keeps the first selected day when navigating to another year', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    await user.click(screen.getByRole('button', { name: /February 15th, 2024/i }));
    expect(screen.getByRole('dialog', { name: 'Choose report period' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2025');
    expect(screen.getByText('Start: Feb 15, 2024. Choose an end date.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /February 15th, 2025/i }));

    expect(screen.getByRole('button', { name: /Period: Feb 15, 2024 – Feb 15, 2025/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Detail' })).toHaveValue('year');
  });

  it('accepts a range selected from a later year back to an earlier year', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2025');
    await user.click(screen.getByRole('button', { name: /February 15th, 2025/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2024');
    expect(screen.getByText('Start: Feb 15, 2025. Choose an end date.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /February 15th, 2024/i }));

    expect(screen.getByRole('button', { name: /Period: Feb 15, 2024 – Feb 15, 2025/ })).toBeInTheDocument();
  });

  it('accepts a cross-year day range and pages the daily report', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    await screen.findByRole('img', { name: /stacked daily client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2025');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Month' }), '0');
    await user.click(screen.getByRole('button', { name: /January 15th, 2025/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2024');
    await user.click(screen.getByRole('button', { name: /January 15th, 2024/i }));

    expect(screen.getByRole('button', { name: /Period: Jan 15, 2024 – Jan 15, 2025/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    expect(await screen.findByRole('img', { name: /stacked daily client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
