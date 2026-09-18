import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import company from '../data/company.json';

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

  it('changes report detail without presenting monthly values as daily data', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => company }));
    renderApp();
    await screen.findByRole('img', { name: /stacked monthly client chart/i });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'year');
    expect(screen.getByRole('img', { name: /stacked yearly client chart/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2025' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Detail' }), 'day');
    expect(screen.getByRole('status')).toHaveTextContent('Daily detail is unavailable');
    expect(screen.queryByRole('img', { name: /stacked/i })).not.toBeInTheDocument();
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
});
