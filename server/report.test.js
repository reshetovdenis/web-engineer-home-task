import { describe, expect, it } from 'vitest';
import company from '../data/company.json';
import { createReport } from './report.js';

function identities(node) {
  return [node.id, node.name, ...(node.branches ?? node.employees ?? node.channels ?? []).flatMap(identities)];
}

describe('generated reports', () => {
  it('preserves supplied monthly values and the entire hierarchy', () => {
    const report = createReport(company, '2024-02-01', '2025-01-31', 'month');
    expect(report.generated).toBe(false);
    expect(report.root).toEqual(company);
    expect(report.labels).toHaveLength(12);
  });

  it('generates repeatable values outside the source months with the same branches and people', () => {
    const report = createReport(company, '2025-01-01', '2025-03-31', 'month');
    expect(report.generated).toBe(true);
    expect(report.labels).toEqual(['Jan 25', 'Feb 25', 'Mar 25']);
    expect(report.root.values[0]).toBe(company.values[11]);
    expect(report.root.values.slice(1).every(value => Number.isInteger(value) && value >= 0)).toBe(true);
    expect(identities(report.root)).toEqual(identities(company));
    expect(createReport(company, '2025-01-01', '2025-03-31', 'month')).toEqual(report);
  });

  it('generates day values and uses the month value at month end', () => {
    const daily = createReport(company, '2024-02-27', '2024-02-29', 'day');
    expect(daily.generated).toBe(true);
    expect(daily.labels).toEqual(['Feb 27', 'Feb 28', 'Feb 29']);
    expect(daily.root.values[2]).toBe(company.values[0]);
    expect(identities(daily.root)).toEqual(identities(company));
  });

  it('uses the last included month for each year', () => {
    const yearly = createReport(company, '2024-10-01', '2025-02-28', 'year');
    expect(yearly.labels).toEqual(['2024', '2025']);
    expect(yearly.root.values[0]).toBe(company.values[10]);
    expect(yearly.root.values[1]).toBeGreaterThanOrEqual(0);
  });

  it('supports multi-year day ranges and rejects invalid dates', () => {
    expect(createReport(company, '2024-03-01', '2025-03-31', 'day').labels).toHaveLength(396);
    expect(() => createReport(company, '2025-02-30', '2025-03-01', 'month')).toThrow(RangeError);
    expect(() => createReport(company, '2025-03-01', '2025-02-01', 'month')).toThrow(RangeError);
  });
});
