import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chart } from './Chart';
import { chartSeries, toBusinessNode } from '../report/viewModel';
import rawCompany from '../../data/company.json';
import { createReport } from '../../server/report.ts';
import { fullReportRange, reportLabels } from '../report/reportPeriod';

const defaultLabels = reportLabels(fullReportRange, 'month');
const company = toBusinessNode(rawCompany);

describe('Chart', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders only the series supplied by the selected node', () => {
    const anna = company.branches[0].employees![0];
    const series = chartSeries(anna);
    expect(series.map(item => item.name)).toEqual(['Existing clients', 'New organic', 'New paid']);
    expect(series.map(item => item.values)).toEqual(anna.channels!.map(channel => channel.values));

    const { container, rerender } = render(<Chart node={company} labels={defaultLabels} />);
    expect(screen.getByRole('img', { name: /stacked monthly client chart for company/i })).toBeInTheDocument();
    expect(container.querySelectorAll('path[name="Clients"]')).toHaveLength(12);
    expect(container.querySelectorAll('path[name="Existing clients"], path[name="New organic"], path[name="New paid"]')).toHaveLength(0);

    rerender(<Chart node={anna} labels={defaultLabels} />);
    expect(container.querySelectorAll('path[name="Clients"]')).toHaveLength(0);
    expect(container.querySelectorAll('path[name="Existing clients"]')).not.toHaveLength(0);
    expect(container.querySelectorAll('path[name="New organic"]')).not.toHaveLength(0);
    expect(container.querySelectorAll('path[name="New paid"]')).not.toHaveLength(0);
  });

  it('shows a total for nodes without channels and a single series for channel rows', () => {
    const leaf = company.branches[1];
    expect(chartSeries(company).map(series => series.name)).toEqual(['Clients']);
    expect(chartSeries(leaf)).toEqual([{
      id: 'total', name: 'Clients', values: leaf.values, color: 'var(--chart-total-clients)',
    }]);

    const organic = company.branches[0].employees![0].channels![1];
    expect(chartSeries(organic).map(series => series.name)).toEqual(['New organic']);

    const { container, rerender } = render(<Chart node={leaf} labels={defaultLabels} />);
    expect(container.querySelectorAll('path[name="Clients"]')).toHaveLength(12);
    rerender(<Chart node={organic} labels={defaultLabels} />);
    expect(container.querySelectorAll('path[name="New organic"]')).toHaveLength(organic.values.filter(value => value > 0).length);
    expect(container.querySelectorAll('path[name="Clients"]')).toHaveLength(0);
  });

  it('scales the Y axis to the displayed stacked series instead of an inconsistent aggregate total', () => {
    const anna = company.branches[0].employees![0];
    const stacked = {
      ...anna,
      values: Array(12).fill(10),
      channels: anna.channels.map((channel, index) => ({
        ...channel,
        values: Array(12).fill(index === 0 ? 8 : index === 1 ? 7 : 0),
      })),
    };

    const { container } = render(<Chart node={stacked} labels={defaultLabels} />);
    const yLabels = [...container.querySelectorAll('text[orientation="left"]')]
      .map(label => Number(label.textContent?.replaceAll(',', '')));

    expect(Math.max(...yLabels)).toBeGreaterThanOrEqual(15);
  });

  it('updates Y axis levels for the selected row, including small and zero values', () => {
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

  it('shows every date label on a 31-day chart page', () => {
    vi.stubGlobal('innerWidth', 320);
    const report = toBusinessNode(createReport(rawCompany, '2025-01-01', '2025-01-31', 'day'));
    const reportDayLabels = reportLabels({ from: new Date(2025, 0, 1), to: new Date(2025, 0, 31) }, 'day');
    const { container } = render(<Chart node={report} labels={reportDayLabels} detail="day" />);
    const labels = container.querySelectorAll('text[orientation="bottom"]');
    expect(labels).toHaveLength(31);
    expect(labels[0]).toHaveTextContent('Jan 1');
    expect(labels[30]).toHaveTextContent('Jan 31');
  });

  it('fits all bars inside a narrow chart container', () => {
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
    const bars = [...container.querySelectorAll('path[name="Clients"]')];
    expect(bars).toHaveLength(12);
    expect(bars.every(bar => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) <= 351)).toBe(true);
  });
});
