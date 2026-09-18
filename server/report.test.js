import { describe, expect, it } from 'vitest';
import company from '../data/company.json';
import { createReport } from './report.js';

function identities(node) {
  return [node.id, node.name, ...(node.branches ?? node.employees ?? node.channels ?? []).flatMap(identities)];
}

describe('generated reports', () => {
  it('preserves supplied monthly values and the entire hierarchy', () => {
    const report = createReport(company, '2024-02-01', '2025-01-31', 'month');
    expect(report).toEqual(company);
    expect(Object.keys(report)).toEqual(Object.keys(company));
  });

  it('generates repeatable values outside the source months with the same branches and people', () => {
    const report = createReport(company, '2025-01-01', '2025-03-31', 'month');
    expect(report.values[0]).toBe(company.values[11]);
    expect(report.values.slice(1).every(value => Number.isInteger(value) && value >= 0)).toBe(true);
    expect(identities(report)).toEqual(identities(company));
    expect(createReport(company, '2025-01-01', '2025-03-31', 'month')).toEqual(report);
  });

  it('generates day values and uses the month value at month end', () => {
    const daily = createReport(company, '2024-02-27', '2024-02-29', 'day');
    expect(daily.values).toHaveLength(3);
    expect(daily.values[2]).toBe(company.values[0]);
    expect(identities(daily)).toEqual(identities(company));
  });

  it('totals the selected months for each year throughout the hierarchy', () => {
    const yearly = createReport(company, '2024-10-01', '2025-02-28', 'year');
    const monthly = createReport(company, '2024-10-01', '2025-02-28', 'month');
    expect(yearly.values).toEqual([
      monthly.values.slice(0, 3).reduce((sum, value) => sum + value, 0),
      monthly.values.slice(3).reduce((sum, value) => sum + value, 0),
    ]);
    expect(yearly.branches[0].employees[0].values[0]).toBe(
      monthly.branches[0].employees[0].values.slice(0, 3).reduce((sum, value) => sum + value, 0));
  });

  it('supports multi-year day ranges and rejects invalid dates', () => {
    expect(createReport(company, '2024-03-01', '2025-03-31', 'day').values).toHaveLength(396);
    expect(() => createReport(company, '2025-02-30', '2025-03-01', 'month')).toThrow(RangeError);
    expect(() => createReport(company, '2025-03-01', '2025-02-01', 'month')).toThrow(RangeError);
  });
});
