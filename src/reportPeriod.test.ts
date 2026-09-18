import { describe, expect, it } from 'vitest';
import company from '../data/company.json';
import { isOriginalMonthlyReport, reportData } from './reportPeriod';

describe('report periods', () => {
  it('keeps monthly observations overlapping the selected dates', () => {
    const report = reportData(company, { from: new Date(2024, 7, 15), to: new Date(2024, 9, 2) }, 'month');
    expect(report?.labels).toEqual(['Aug 24', 'Sep 24', 'Oct 24']);
    expect(report?.root.values).toEqual(company.values.slice(6, 9));
    expect(report?.root.branches?.[0].employees?.[0].channels?.[1].values)
      .toEqual(company.branches[0].employees![0].channels![1].values.slice(6, 9));
  });

  it('uses the final included monthly observation for each year', () => {
    const report = reportData(company, { from: new Date(2024, 9, 1), to: new Date(2025, 0, 31) }, 'year');
    expect(report?.labels).toEqual(['2024', '2025']);
    expect(report?.root.values).toEqual([company.values[10], company.values[11]]);
  });

  it('uses the supplied API only for months wholly within its date range', () => {
    expect(isOriginalMonthlyReport({ from: new Date(2024, 1, 1), to: new Date(2025, 0, 31) }, 'month')).toBe(true);
    expect(isOriginalMonthlyReport({ from: new Date(2025, 0, 1), to: new Date(2025, 1, 28) }, 'month')).toBe(false);
    expect(isOriginalMonthlyReport({ from: new Date(2024, 1, 1), to: new Date(2025, 0, 31) }, 'day')).toBe(false);
  });
});
