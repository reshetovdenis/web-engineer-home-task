import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import rawCompany from '../data/company.json';
import { createLazyReportPage, createReport } from '../server/report.ts';
import type { BusinessNode } from './report/data';

const company = rawCompany;


function findRawNode(node: BusinessNode, id: string): BusinessNode | undefined {
  if (node.id === id) return node;
  for (const child of [...(node.branches ?? []), ...(node.employees ?? []), ...(node.channels ?? [])]) {
    const result = findRawNode(child, id);
    if (result) return result;
  }
}

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
    ).toHaveTextContent('Loading...');
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

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load client data');
    expect(alert).toHaveTextContent('The server returned 500.');
    expect(alert).toHaveClass('fixed', 'inset-0');

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


  it('uses the paginated child contract and hydrates a selected employee for the chart', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(String(input), 'http://localhost');
      const params = url.searchParams;
      if (url.pathname === '/api/report/children') {
        const node = findRawNode(company, params.get('parentId')!);
        if (!node) return { ok: false, status: 404 };
        return {
          ok: true,
          json: async () => createLazyReportPage(
            node,
            params.get('from')!,
            params.get('to')!,
            params.get('detail')!,
            Number(params.get('offset')),
            Number(params.get('limit')),
          ),
        };
      }
      return {
        ok: true,
        json: async () => createLazyReportPage(
          company,
          params.get('from')!,
          params.get('to')!,
          params.get('detail')!,
          0,
          50,
        ),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    expect(screen.queryByRole('button', { name: /Anna Blackwood, employee/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Branch 1' }));
    const anna = await screen.findByRole('button', { name: /Anna Blackwood, employee/ });

    const childRequests = () => fetchMock.mock.calls
      .map(([url]) => new URL(String(url), 'http://localhost'))
      .filter(url => url.pathname === '/api/report/children');
    expect(childRequests()).toHaveLength(1);
    expect(childRequests()[0].searchParams.get('parentId')).toBe(company.branches![0].id);
    expect(childRequests()[0].searchParams.get('offset')).toBe('0');
    expect(childRequests()[0].searchParams.get('limit')).toBe('50');

    await user.click(anna);
    await screen.findByRole('img', { name: /stacked monthly client chart for Anna Blackwood/i });
    await waitFor(() => expect(container.querySelectorAll('path[name="Existing clients"]')).not.toHaveLength(0));
    expect(childRequests()).toHaveLength(2);
    expect(childRequests()[1].searchParams.get('parentId')).toBe(company.branches![0].employees![0].id);

    await user.click(screen.getByRole('button', { name: 'Expand Anna Blackwood' }));
    expect(await screen.findByRole('button', { name: /Existing clients, channel/ })).toBeInTheDocument();
    expect(childRequests()).toHaveLength(2);
  });


  it('shows an error when loading children for a selected node fails', async () => {
    const user = userEvent.setup();
    const employeeId = company.branches![0].employees![0].id;
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(String(input), 'http://localhost');
      const params = url.searchParams;
      if (url.pathname === '/api/report/children') {
        if (params.get('parentId') === employeeId) throw new TypeError('Failed to fetch');
        const node = findRawNode(company, params.get('parentId')!);
        if (!node) return { ok: false, status: 404 };
        return {
          ok: true,
          json: async () => createLazyReportPage(
            node,
            params.get('from')!,
            params.get('to')!,
            params.get('detail')!,
            Number(params.get('offset')),
            Number(params.get('limit')),
          ),
        };
      }
      return {
        ok: true,
        json: async () => createLazyReportPage(
          company,
          params.get('from')!,
          params.get('to')!,
          params.get('detail')!,
          0,
          50,
        ),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: 'Expand Branch 1' }));
    const anna = await screen.findByRole('button', { name: /Anna Blackwood, employee/ });
    await user.click(anna);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load children for Anna Blackwood');
    expect(alert).toHaveTextContent('Failed to fetch');
    expect(alert).toHaveClass('fixed', 'inset-0');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
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
    const fetchMock = vi.fn(async (input: string) => reportResponse(input));
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

  it('shows a cross-year day range in one chart with narrower bars', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    const { container } = renderApp();
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
    const bars = container.querySelectorAll('path[name="Clients"]');
    expect(bars).toHaveLength(367);
    expect(Number(bars[0].getAttribute('width'))).toBeLessThan(4);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('disables daily detail when the selected period exceeds one year', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => reportResponse(input)));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    await screen.findByRole('img', { name: /stacked daily client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Month' }), '0');
    await user.click(screen.getByRole('button', { name: /January 15th, 2024/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2025');
    await user.click(screen.getByRole('button', { name: /January 16th, 2025/i }));

    expect(screen.getByRole('button', { name: /Period: Jan 15, 2024 – Jan 16, 2025/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Detail' })).toHaveValue('year');
    expect(screen.getByRole('option', { name: 'By day' })).toBeDisabled();
    expect(await screen.findByRole('img', { name: /stacked yearly client chart/i })).toBeInTheDocument();
  });
});
