import type { BusinessNode } from './data';

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

export function reportLabels(range: ReportRange, detail: ReportDetail): string[] {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    ...(detail === 'day' ? { day: 'numeric' } : { year: '2-digit' }),
  });
  const labels: string[] = [];
  if (detail === 'year') {
    for (let year = range.from.getFullYear(); year <= range.to.getFullYear(); year++) labels.push(String(year));
  } else if (detail === 'month') {
    for (let year = range.from.getFullYear(), month = range.from.getMonth();
      year < range.to.getFullYear() || year === range.to.getFullYear() && month <= range.to.getMonth(); month++) {
      if (month === 12) { year++; month = 0; }
      labels.push(formatter.format(new Date(year, month, 1)));
    }
  } else {
    for (const date = new Date(range.from); date <= range.to; date.setDate(date.getDate() + 1)) {
      labels.push(formatter.format(date));
    }
  }
  return labels;
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
