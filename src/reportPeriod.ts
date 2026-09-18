import { months, type BusinessNode } from './data';

export type ReportDetail = 'year' | 'month' | 'day';
export interface ReportRange { from: Date; to: Date }

export const firstReportDay = new Date(2024, 1, 1);
export const lastReportDay = new Date(2025, 0, 31);
export const fullReportRange: ReportRange = { from: firstReportDay, to: lastReportDay };

function monthDate(index: number) {
  return new Date(2024, index + 1, 1);
}

function projectNode(node: BusinessNode, indexes: number[]): BusinessNode {
  return {
    ...node,
    values: indexes.map(index => node.values[index]),
    ...(node.branches && { branches: node.branches.map(child => projectNode(child, indexes)) }),
    ...(node.employees && { employees: node.employees.map(child => projectNode(child, indexes)) }),
    ...(node.channels && { channels: node.channels.map(child => projectNode(child, indexes)) }),
  };
}

export function reportData(root: BusinessNode, range: ReportRange, detail: ReportDetail) {
  if (detail === 'day') return null;

  const included = months.flatMap((_, index) => {
    const start = monthDate(index);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return start <= range.to && end >= range.from ? [index] : [];
  });

  const indexes = detail === 'month' ? included : included.filter((index, position) =>
    position === included.length - 1 || monthDate(index).getFullYear() !== monthDate(included[position + 1]).getFullYear());
  const labels = indexes.map(index => detail === 'year' ? String(monthDate(index).getFullYear()) : months[index]);

  return { root: projectNode(root, indexes), labels };
}
