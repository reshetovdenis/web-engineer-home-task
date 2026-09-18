import type { BusinessNode } from '../src/data';

export function createReport(
  root: BusinessNode,
  from: string,
  to: string,
  detail: 'year' | 'month' | 'day',
): { root: BusinessNode; labels: string[]; generated: boolean };
