import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chart } from './Chart';
import { chartSeries, months } from './data';
import company from '../data/company.json';

describe('chart data mapping', () => {
  it('maps the supplied new-client channels and preserves reported totals', () => {
    const series = chartSeries(company);
    expect(series.map(item => item.name)).toEqual(['Existing clients', 'New organic', 'New paid']);
    expect(series[1].values).toEqual(company.branches[0].employees![0].channels![1].values);
    expect(series[2].values).toEqual(company.branches[0].employees![0].channels![2].values);
    months.forEach((_, index) => expect(series.reduce((sum, item) => sum + item.values[index], 0)).toBe(company.values[index]));
    const { container } = render(<Chart node={company} />);
    expect(screen.getByRole('img', { name: /stacked monthly client chart for company/i })).toBeInTheDocument();
    expect(container.querySelectorAll('rect[data-series]')).toHaveLength(36);
    expect(container.querySelector('rect[data-series="New organic"][data-month="May 24"]')).toHaveAttribute('data-value', '1');
    expect(container.querySelector('rect[data-series="Existing clients"][data-month="May 24"]')).toHaveAttribute('data-value', '299');
  });

  it('places an unattributed leaf value in the existing-clients series', () => {
    const leaf = company.branches[1];
    const series = chartSeries(leaf);
    expect(series[0].values).toEqual(leaf.values);
    expect(series[1].values).toEqual(Array(12).fill(0));
    expect(series[2].values).toEqual(Array(12).fill(0));
  });
});
