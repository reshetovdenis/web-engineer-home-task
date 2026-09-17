import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import company from '../data/company.json';

describe('App request states', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state while the request is pending', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );

    render(<App />);

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

    render(<App />);

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

    render(<App />);

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
});