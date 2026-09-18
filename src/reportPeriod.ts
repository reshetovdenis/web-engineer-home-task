import { months, type BusinessNode } from './data';

export type ReportDetail = 'year' | 'month' | 'day';
export interface ReportRange { from: Date; to: Date }

export const firstReportDay = new Date(2024, 1, 1);
export const lastReportDay = new Date(2025, 0, 31);
export const firstSelectableDay = new Date(2020, 0, 1);
export const lastSelectableDay = new Date(2030, 11, 31);
export const fullReportRange: ReportRange = { from: firstReportDay, to: lastReportDay };

export function detailForRange(range: ReportRange): ReportDetail {
  const fromDay = Date.UTC(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  const toDay = Date.UTC(range.to.getFullYear(), range.to.getMonth(), range.to.getDate());
  if ((toDay - fromDay) / 86400000 + 1 <= 31) return 'day';

  const calendarMonths = (range.to.getFullYear() - range.from.getFullYear()) * 12
    + range.to.getMonth() - range.from.getMonth() + 1;
  return calendarMonths <= 12 ? 'month' : 'year';
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isOriginalMonthlyReport(range: ReportRange, detail: ReportDetail) {
  return detail === 'month' && range.from >= firstReportDay && range.to <= lastReportDay;
}

function monthDate(index: number) {
  return new Date(2024, index + 1, 1);
}

function projectNode(node: BusinessNode, groups: number[][]): BusinessNode {
  return {
    ...node,
    values: groups.map(indexes => indexes.reduce((sum, index) => sum + node.values[index], 0)),
    ...(node.branches && { branches: node.branches.map(child => projectNode(child, groups)) }),
    ...(node.employees && { employees: node.employees.map(child => projectNode(child, groups)) }),
    ...(node.channels && { channels: node.channels.map(child => projectNode(child, groups)) }),
  };
}

export function reportPage(root: BusinessNode, labels: string[], start: number, size: number) {
  const end = Math.min(start + size, labels.length);
  const groups = Array.from({ length: end - start }, (_, index) => [start + index]);
  return { root: projectNode(root, groups), labels: labels.slice(start, end) };
}

export function reportData(root: BusinessNode, range: ReportRange, detail: ReportDetail) {
  if (detail === 'day') return null;

  const included = months.flatMap((_, index) => {
    const start = monthDate(index);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return start <= range.to && end >= range.from ? [index] : [];
  });

  const groups = detail === 'month' ? included.map(index => [index]) : included.reduce<number[][]>((result, index) => {
    if (!result.length || monthDate(result.at(-1)![0]).getFullYear() !== monthDate(index).getFullYear()) result.push([]);
    result.at(-1)!.push(index);
    return result;
  }, []);
  const labels = groups.map(indexes => detail === 'year' ? String(monthDate(indexes[0]).getFullYear()) : months[indexes[0]]);

  return { root: projectNode(root, groups), labels };
}
