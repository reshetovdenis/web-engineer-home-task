import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import company from '../data/company.json';
import type { BusinessNode } from './data';

function renderApp(queryClient = new QueryClient()) {
  return render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
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

  it('uses fresh cached company data when mounted again', async () => {
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
  });

  it('loads year and day reports from the generated report endpoint', async () => {
    const user = userEvent.setup();
    function project(node: BusinessNode, indexes: number[]): BusinessNode {
      return {
        ...node,
        values: indexes.map(index => node.values[index]),
        ...(node.branches && { branches: node.branches.map(child => project(child, indexes)) }),
        ...(node.employees && { employees: node.employees.map(child => project(child, indexes)) }),
        ...(node.channels && { channels: node.channels.map(child => project(child, indexes)) }),
      };
    }
    const fetchMock = vi.fn(async (input: string) => {
      if (input === '/api/company') return { ok: true, json: async () => company };
      const detail = new URL(input, 'http://localhost').searchParams.get('detail');
      const indexes = detail === 'year' ? [10, 11] : Array(31).fill(11);
      return { ok: true, json: async () => ({ root: project(company, indexes), labels: detail === 'year' ? ['2024', '2025'] : Array.from({ length: 31 }, (_, index) => `Jan ${index + 1}`), generated: detail === 'day' }) };
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

  it('generates the selected report from company data when an older API returns 404', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string) => input === '/api/company'
      ? { ok: true, json: async () => company }
      : { ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'year');
    expect(await screen.findByRole('img', { name: /stacked yearly client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    expect(await screen.findByRole('img', { name: /stacked daily client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Branch 1, branch/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('detail=day'))).toBe(true);
  });

  it('selects a report period with DayPicker', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => company }));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    expect(screen.getByRole('dialog', { name: 'Choose report period' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /February 15th, 2024/i }));
    await user.click(screen.getByRole('button', { name: /February 20th, 2024/i }));

    expect(screen.queryByRole('dialog', { name: 'Choose report period' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Period: Feb 15, 2024 – Feb 20, 2024/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feb 2024' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Mar 2024' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('path[name="Existing clients"]')).toHaveLength(1);
  });

  it('keeps the first selected day when navigating to another year', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => input === '/api/company'
      ? { ok: true, json: async () => company }
      : { ok: false, status: 404 }));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.click(screen.getByRole('button', { name: /Period:/ }));
    await user.click(screen.getByRole('button', { name: /February 15th, 2024/i }));
    expect(screen.getByRole('dialog', { name: 'Choose report period' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose the Year' }), '2025');
    expect(screen.getByText('Start: Feb 15, 2024. Choose an end date.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /February 15th, 2025/i }));

    expect(screen.getByRole('button', { name: /Period: Feb 15, 2024 – Feb 15, 2025/ })).toBeInTheDocument();
  });

  it('accepts a range selected from a later year back to an earlier year', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => input === '/api/company'
      ? { ok: true, json: async () => company }
      : { ok: false, status: 404 }));
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
    vi.stubGlobal('fetch', vi.fn(async (input: string) => input === '/api/company'
      ? { ok: true, json: async () => company }
      : { ok: false, status: 404 }));
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
    expect(await screen.findByRole('img', { name: /stacked daily client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
