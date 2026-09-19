import { describe, expect, it } from 'vitest';
import company from '../data/company.json';
import { companyForReportRange, scaleDemoBranchId, scaleDemoEmployeeCount, usesGeneratedPeriod } from './demoData.ts';

describe('scale demo report data', () => {
  it('keeps the supplied hierarchy unchanged for the default source period', () => {
    expect(usesGeneratedPeriod('2024-02-01', '2025-01-31')).toBe(false);
    expect(companyForReportRange(company, '2024-02-01', '2025-01-31')).toBe(company);
  });

  it('adds a deterministic 2,000-employee branch for generated periods', () => {
    expect(usesGeneratedPeriod('2025-02-01', '2025-03-31')).toBe(true);
    const augmented = companyForReportRange(company, '2025-02-01', '2025-03-31');
    const scaleBranch = augmented.branches?.find(branch => branch.id === scaleDemoBranchId);

    expect(scaleBranch?.employees).toHaveLength(scaleDemoEmployeeCount);
    expect(scaleBranch?.employees?.[0].name).toBe('Scale Employee 0001');
    expect(scaleBranch?.employees?.at(-1)?.name).toBe('Scale Employee 2000');
    expect(scaleBranch?.values).toHaveLength(12);
    expect(augmented.values).toEqual(augmented.values.map((_, period) =>
      augmented.branches!.reduce((sum, branch) => sum + branch.values[period], 0)));
  });
});
