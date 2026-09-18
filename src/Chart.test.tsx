import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chart } from './Chart';
import { chartSeries } from './data';
import company from '../data/company.json';
import { createReport } from '../server/report.ts';
import { fullReportRange, reportLabels } from './reportPeriod';

const defaultLabels = reportLabels(fullReportRange, 'month');

describe('chart data mapping', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps the supplied new-client channels and preserves reported totals', () => {
    vi.stubGlobal('innerWidth', 1440);
    const series = chartSeries(company);
    expect(series.map(item => item.name)).toEqual(['Existing clients', 'New organic', 'New paid']);
    expect(series[1].values).toEqual(company.branches[0].employees![0].channels![1].values);
    expect(series[2].values).toEqual(company.branches[0].employees![0].channels![2].values);
    defaultLabels.forEach((_, index) => expect(series.reduce((sum, item) => sum + item.values[index], 0)).toBe(company.values[index]));
    const { container } = render(<Chart node={company} labels={defaultLabels} />);
    expect(screen.getByRole('img', { name: /stacked monthly client chart for company/i })).toBeInTheDocument();
    const existingBars = container.querySelectorAll('path[name="Existing clients"]');
    expect(existingBars).toHaveLength(12);
    expect(existingBars[0]).toHaveAttribute('fill', 'var(--chart-existing-clients)');
    expect(existingBars[0].getAttribute('d')?.match(/A 4,4/g)).toHaveLength(4);
    const gridLines = container.querySelectorAll('.recharts-cartesian-grid-horizontal line');
    expect(gridLines.length).toBeGreaterThan(0);
    for (const line of gridLines) {
      expect(line).toHaveAttribute('stroke', 'var(--chart-grid-line)');
      expect(line).toHaveAttribute('stroke-width', '1');
      expect(line).toHaveAttribute('stroke-dasharray', '1 6');
    }
    expect(Number(existingBars[0].getAttribute('x'))).toBeCloseTo(66, 0);
    expect(Number(existingBars[0].getAttribute('width'))).toBeCloseTo(88, 0);
    expect(existingBars[0]).toHaveAttribute('height', '210');
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

  it('rounds only the outer edges of each stacked bar', () => {
    vi.stubGlobal('innerWidth', 1440);
    const anna = company.branches[0].employees![0];
    const { container } = render(<Chart node={anna} labels={defaultLabels} />);
    const paths = (name: string) => [...container.querySelectorAll(`path[name="${name}"]`)];
    const corners = (path: Element) => path.getAttribute('d')?.match(/A 4,4/g)?.length ?? 0;
    const existing = paths('Existing clients');
    const organic = paths('New organic');
    const paid = paths('New paid');

    expect(corners(existing[0])).toBe(4); // Only one visible segment in February.
    expect(corners(existing[2])).toBe(2); // Bottom of the April stack.
    expect(corners(organic[2])).toBe(0); // Interior of the April stack.
    expect(corners(paid[2])).toBe(2); // Top of the April stack.
  });

  it('updates Y axis levels for the selected row, including small and zero values', () => {
    vi.stubGlobal('innerWidth', 1440);
    const anna = company.branches[0].employees![0];
    const organic = anna.channels![1];
    const { container, rerender } = render(<Chart node={company} labels={defaultLabels} />);
    const labels = () => [...container.querySelectorAll('text[orientation="left"]')]
      .map(label => label.textContent);

    expect(labels()).toEqual(['0', '100', '200', '300', '400']);
    rerender(<Chart node={anna} labels={defaultLabels} />);
    expect(labels()).toEqual(['0', '10', '20', '30', '40']);
    rerender(<Chart node={organic} labels={defaultLabels} />);
    expect(labels()).toEqual(['0', '1', '2']);
    rerender(<Chart node={{ ...organic, values: Array(12).fill(0) }} labels={defaultLabels} />);
    expect(labels()).toEqual(['0', '1']);
  });

  it('shows every month label vertically at iPad mini portrait width', () => {
    vi.stubGlobal('innerWidth', 768);
    const { container } = render(<Chart node={company} labels={defaultLabels} />);
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(12);
    expect(labels[0].getAttribute('transform')).toContain('rotate(-90');
  });

  it('shows every date label on a 31-day chart page', () => {
    vi.stubGlobal('innerWidth', 320);
    const report = createReport(company, '2025-01-01', '2025-01-31', 'day');
    const reportDayLabels = reportLabels({ from: new Date(2025, 0, 1), to: new Date(2025, 0, 31) }, 'day');
    const { container } = render(<Chart node={report} labels={reportDayLabels} detail="day" />);
    expect(container.querySelector('.recharts-wrapper > svg.recharts-surface')).toHaveAttribute('width', '296');
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(31);
    expect(labels[0]).toHaveTextContent('Jan 1');
    expect(labels[30]).toHaveTextContent('Jan 31');
    expect(Number(labels[30].getAttribute('x'))).toBeLessThanOrEqual(296);
    expect([...container.querySelectorAll('path[name="Existing clients"]')]
      .every(bar => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) <= 296)).toBe(true);
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

    const { container } = render(<Chart node={company} labels={defaultLabels} />);
    act(() => resize?.([{ contentRect: { width: 351, height: 430 } } as ResizeObserverEntry], {} as ResizeObserver));

    expect(container.querySelector('.recharts-wrapper > svg.recharts-surface')).toHaveAttribute('width', '351');
    const bars = [...container.querySelectorAll('path[name="Existing clients"]')];
    expect(bars).toHaveLength(12);
    expect(bars.every(bar => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) <= 351)).toBe(true);
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(12);
    expect(labels[0].getAttribute('transform')).toContain('rotate(-90');
    expect(labels[0]).toHaveTextContent('Feb 2024');
    expect(labels[11]).toHaveTextContent('Jan 2025');
  });
});
