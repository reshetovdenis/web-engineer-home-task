import type { BusinessNode } from '../src/report/data.js';

export const scaleDemoEmployeeCount = 2000;
export const scaleDemoBranchId = 'scale-demo-branch';

const suppliedFrom = Date.UTC(2024, 1, 1);
const suppliedTo = Date.UTC(2025, 0, 31);

function parseDate(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(time) ? undefined : time;
}

export function usesGeneratedPeriod(fromValue: unknown, toValue: unknown): boolean {
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  return from !== undefined && to !== undefined && (from < suppliedFrom || to > suppliedTo);
}

function employeeValues(index: number): number[] {
  const base = 4 + (index % 13);
  return Array.from({ length: 12 }, (_, month) =>
    Math.max(0, base + ((index * 7 + month * 5) % 9) - 4 + Math.floor(month / 4)));
}

const scaleEmployees: BusinessNode[] = Array.from({ length: scaleDemoEmployeeCount }, (_, index) => ({
  id: `scale-demo-employee-${String(index + 1).padStart(4, '0')}`,
  name: `Employee ${String(index + 1).padStart(4, '0')}`,
  values: employeeValues(index),
}));

function aggregateValues(children: BusinessNode[], periodCount: number): number[] {
  return Array.from({ length: periodCount }, (_, period) =>
    children.reduce((sum, child) => sum + (child.values[period] ?? 0), 0));
}

const scaleBranchValues = aggregateValues(scaleEmployees, 12);

const scaleBranch: BusinessNode = {
  id: scaleDemoBranchId,
  name: `Demo — ${scaleDemoEmployeeCount.toLocaleString('en-US')} employees`,
  values: scaleBranchValues,
  employees: scaleEmployees,
};

/**
 * The supplied fixture intentionally stays small for the default report. When
 * users ask for dates that have to be generated rather than read from the
 * supplied Feb 2024–Jan 2025 values, add a large deterministic branch. This
 * makes the scalability behavior easy to exercise without making first load
 * expensive or changing the original fixture.
 */
export function companyForReportRange(root: BusinessNode, fromValue: unknown, toValue: unknown): BusinessNode {
  if (!usesGeneratedPeriod(fromValue, toValue)) return root;
  const branches = [...(root.branches ?? []), scaleBranch];
  return {
    ...root,
    values: aggregateValues(branches, root.values.length),
    branches,
  };
}
