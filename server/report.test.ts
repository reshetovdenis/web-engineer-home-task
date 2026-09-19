import { describe, expect, it } from 'vitest';
import company from '../data/company.json';
import type { BusinessNode } from '../src/data';
import { companyForReportRange, scaleDemoBranchId } from './demoData.ts';
import { createLazyReport, createLazyReportPage, createReport } from './report.ts';

function identities(node: BusinessNode): string[] {
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
    expect(yearly.branches![0].employees![0].values[0]).toBe(
      monthly.branches![0].employees![0].values.slice(0, 3).reduce((sum, value) => sum + value, 0));
  });


  it('projects only one hierarchy level for lazy report requests', () => {
    const lazy = createLazyReport(company, '2024-02-01', '2025-01-31', 'month', 1);
    expect(lazy.childrenLoaded).toBe(true);
    expect(lazy.hasChildren).toBe(true);
    expect(lazy.branches).toHaveLength(company.branches!.length);
    expect(lazy.branches![0].hasChildren).toBe(true);
    expect(lazy.branches![0].childrenLoaded).toBe(false);
    expect(lazy.branches![0].employees).toBeUndefined();

    const branch = createLazyReport(company.branches![0], '2024-02-01', '2025-01-31', 'month', 1);
    expect(branch.childrenLoaded).toBe(true);
    expect(branch.employees).toHaveLength(company.branches![0].employees!.length);
    expect(branch.employees![0].hasChildren).toBe(true);
    expect(branch.employees![0].childrenLoaded).toBe(false);
    expect(branch.employees![0].channels).toBeUndefined();
  });

  it('paginates large direct-child collections without hydrating the whole branch', () => {
    const source = companyForReportRange(company, '2025-02-01', '2025-03-31');
    const scaleBranch = source.branches!.find(branch => branch.id === scaleDemoBranchId)!;

    const first = createLazyReportPage(scaleBranch, '2025-02-01', '2025-03-31', 'month', 0, 50);
    expect(first.childCount).toBe(2000);
    expect(first.childrenLoaded).toBe(false);
    expect(first.employees).toHaveLength(50);
    expect(first.employees![0].name).toBe('Scale Employee 0001');
    expect(first.employees!.at(-1)!.name).toBe('Scale Employee 0050');
    expect(first.employees![0].employees).toBeUndefined();

    const second = createLazyReportPage(scaleBranch, '2025-02-01', '2025-03-31', 'month', 50, 50);
    expect(second.childCount).toBe(2000);
    expect(second.childrenLoaded).toBe(false);
    expect(second.employees).toHaveLength(50);
    expect(second.employees![0].name).toBe('Scale Employee 0051');
    expect(second.employees!.at(-1)!.name).toBe('Scale Employee 0100');

    const last = createLazyReportPage(scaleBranch, '2025-02-01', '2025-03-31', 'month', 1950, 50);
    expect(last.childrenLoaded).toBe(true);
    expect(last.employees).toHaveLength(50);
    expect(last.employees!.at(-1)!.name).toBe('Scale Employee 2000');
  });

  it('caps daily reports before expensive projection and rejects invalid dates', () => {
    expect(createReport(company, '2024-01-15', '2025-01-15', 'day').values).toHaveLength(367);
    expect(() => createReport(company, '2024-01-15', '2025-01-16', 'day'))
      .toThrow('Daily reports are limited to 367 days.');
    expect(() => createReport(company, '2020-01-01', '2030-12-31', 'day'))
      .toThrow('Daily reports are limited to 367 days.');
    expect(() => createReport(company, '2025-02-30', '2025-03-01', 'month')).toThrow(RangeError);
    expect(() => createReport(company, '2025-03-01', '2025-02-01', 'month')).toThrow(RangeError);
  });
});
