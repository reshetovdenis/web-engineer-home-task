import { describe, expect, it } from 'vitest';
import type { BusinessNode as ReportNode } from './data';
import { appendBusinessNodePage, childrenOf, toBusinessNode, visibleNodes } from './viewModel';

const values = [10, 11];

function employee(index: number): ReportNode {
  return {
    id: `employee-${index}`,
    name: `Employee ${index}`,
    values,
    hasChildren: false,
    childCount: 0,
    childrenLoaded: true,
  };
}

describe('paginated hierarchy view model', () => {
  it('appends child pages without replacing already loaded children', () => {
    const initial = toBusinessNode({
      id: 'company',
      name: 'Company',
      values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'branch',
        name: 'Paged branch',
        values,
        hasChildren: true,
        childCount: 3,
        childrenLoaded: false,
      }],
    });

    const first = appendBusinessNodePage(initial, 'branch', {
      id: 'branch',
      name: 'Paged branch',
      values,
      hasChildren: true,
      childCount: 3,
      childrenLoaded: false,
      employees: [employee(1), employee(2)],
    });
    const branchAfterFirst = first.branches[0];
    expect(childrenOf(branchAfterFirst).map(child => child.id)).toEqual(['employee-1', 'employee-2']);
    expect(branchAfterFirst.childCount).toBe(3);
    expect(branchAfterFirst.childrenLoaded).toBe(false);

    const second = appendBusinessNodePage(first, 'branch', {
      id: 'branch',
      name: 'Paged branch',
      values,
      hasChildren: true,
      childCount: 3,
      childrenLoaded: true,
      employees: [employee(3)],
    });
    const branchAfterSecond = second.branches[0];
    expect(childrenOf(branchAfterSecond).map(child => child.id)).toEqual(['employee-1', 'employee-2', 'employee-3']);
    expect(branchAfterSecond.childrenLoaded).toBe(true);
  });

  it('uses the server child count for treegrid sibling metadata before every page is loaded', () => {
    const root = toBusinessNode({
      id: 'company',
      name: 'Company',
      values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'branch',
        name: 'Paged branch',
        values,
        hasChildren: true,
        childCount: 120,
        childrenLoaded: false,
        employees: [employee(1), employee(2)],
      }],
    });

    const rows = visibleNodes(root, new Set(['company', 'branch']));
    expect(rows).toHaveLength(4);
    expect(rows[2].position).toBe(1);
    expect(rows[2].siblingCount).toBe(120);
    expect(rows[3].position).toBe(2);
    expect(rows[3].siblingCount).toBe(120);
  });
});
