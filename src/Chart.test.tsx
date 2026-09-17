import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chart } from './Chart';
import { chartSeries, months } from './data';
import company from '../data/company.json';

describe('chart data mapping', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps the supplied new-client channels and preserves reported totals', () => {
    vi.stubGlobal('innerWidth', 1440);
    const series = chartSeries(company);
    expect(series.map(item => item.name)).toEqual(['Existing clients', 'New organic', 'New paid']);
    expect(series[1].values).toEqual(company.branches[0].employees![0].channels![1].values);
    expect(series[2].values).toEqual(company.branches[0].employees![0].channels![2].values);
    months.forEach((_, index) => expect(series.reduce((sum, item) => sum + item.values[index], 0)).toBe(company.values[index]));
    const { container } = render(<Chart node={company} />);
    expect(screen.getByRole('img', { name: /stacked monthly client chart for company/i })).toBeInTheDocument();
    const existingBars = container.querySelectorAll('path[name="Existing clients"]');
    expect(existingBars).toHaveLength(12);
    expect(existingBars[0]).toHaveAttribute('fill', '#b29df8');
    expect(Number(existingBars[0].getAttribute('x'))).toBeCloseTo(66, 0);
    expect(Number(existingBars[0].getAttribute('width'))).toBeCloseTo(88, 0);
    expect(existingBars[0]).toHaveAttribute('height', '200');
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(12);
    expect(labels[0]).not.toHaveAttribute('transform');
  });

  it('places an unattributed leaf value in the existing-clients series', () => {
    const leaf = company.branches[1];
    const series = chartSeries(leaf);
    expect(series[0].values).toEqual(leaf.values);
    expect(series[1].values).toEqual(Array(12).fill(0));
    expect(series[2].values).toEqual(Array(12).fill(0));
  });

  it('angles every month label at iPad mini portrait width', () => {
    vi.stubGlobal('innerWidth', 768);
    const { container } = render(<Chart node={company} />);
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(12);
    expect(labels[0].getAttribute('transform')).toContain('rotate(-45');
  });

  it('fits all bars inside a 375px viewport', () => {
    vi.stubGlobal('innerWidth', 1440);
    let resize: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);

    const { container } = render(<Chart node={company} />);
    act(() => resize?.([{ contentRect: { width: 351, height: 430 } } as ResizeObserverEntry], {} as ResizeObserver));

    expect(container.querySelector('.recharts-wrapper > svg.recharts-surface')).toHaveAttribute('width', '351');
    const bars = [...container.querySelectorAll('path[name="Existing clients"]')];
    expect(bars).toHaveLength(12);
    expect(bars.every(bar => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) <= 351)).toBe(true);
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(5);
    expect(labels[0].getAttribute('transform')).toContain('rotate(-45');
    expect(labels[0]).toHaveTextContent('Feb 2024');
    expect(labels[4]).toHaveTextContent('Jan 2025');
  });
});
