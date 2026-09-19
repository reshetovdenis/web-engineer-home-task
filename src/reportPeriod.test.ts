import { describe, expect, it } from 'vitest';
import { allowsDayDetail, detailForRange, fullReportRange, reportLabels } from './reportPeriod';

describe('report periods', () => {
  it('allows daily detail through the one-year anniversary', () => {
    expect(allowsDayDetail({ from: new Date(2024, 0, 15), to: new Date(2025, 0, 15) })).toBe(true);
    expect(allowsDayDetail({ from: new Date(2024, 0, 15), to: new Date(2025, 0, 16) })).toBe(false);
    expect(allowsDayDetail({ from: new Date(2024, 1, 29), to: new Date(2025, 2, 1) })).toBe(true);
    expect(allowsDayDetail({ from: new Date(2024, 1, 29), to: new Date(2025, 2, 2) })).toBe(false);
  });

  it('chooses day, month, or year detail from the selected span', () => {
    expect(detailForRange({ from: new Date(2024, 1, 1), to: new Date(2024, 2, 2) })).toBe('day');
    expect(detailForRange({ from: new Date(2024, 1, 1), to: new Date(2024, 2, 3) })).toBe('month');
    expect(detailForRange(fullReportRange)).toBe('month');
    expect(detailForRange({ from: new Date(2024, 1, 15), to: new Date(2025, 1, 15) })).toBe('year');
  });


  it('labels the default report to match the source observations', () => {
    expect(reportLabels(fullReportRange, 'month')).toEqual([
      'Feb 24', 'Mar 24', 'Apr 24', 'May 24', 'Jun 24', 'Jul 24',
      'Aug 24', 'Sep 24', 'Oct 24', 'Nov 24', 'Dec 24', 'Jan 25',
    ]);
  });

  it('labels selected day, month, and year ranges', () => {
    expect(reportLabels({ from: new Date(2024, 7, 15), to: new Date(2024, 9, 2) }, 'month'))
      .toEqual(['Aug 24', 'Sep 24', 'Oct 24']);
    expect(reportLabels({ from: new Date(2024, 9, 1), to: new Date(2025, 0, 31) }, 'year'))
      .toEqual(['2024', '2025']);
    expect(reportLabels({ from: new Date(2024, 1, 27), to: new Date(2024, 1, 29) }, 'day'))
      .toEqual(['Feb 27', 'Feb 28', 'Feb 29']);
  });
});
