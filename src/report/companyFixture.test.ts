import { describe, expect, it } from 'vitest';
import company from '../../data/company.json';
import type { BusinessNode } from './data';

const validChannelNames = new Set(['Existing clients', 'New organic', 'New paid']);

describe('company fixture invariants', () => {
  it('uses unique IDs and valid non-negative numeric series throughout the hierarchy', () => {
    const ids = new Set<string>();
    const visit = (node: BusinessNode, parentKind?: 'employee') => {
      expect(node.id).toBeTruthy();
      expect(ids.has(node.id), `duplicate id: ${node.id}`).toBe(false);
      ids.add(node.id);
      expect(node.name).toBeTruthy();
      expect(node.values).toHaveLength(12);
      expect(node.values.every(value => Number.isFinite(value) && value >= 0)).toBe(true);

      if (parentKind === 'employee') expect(validChannelNames.has(node.name)).toBe(true);
      for (const branch of node.branches ?? []) visit(branch);
      for (const employee of node.employees ?? []) visit(employee);
      for (const channel of node.channels ?? []) visit(channel, 'employee');
    };

    visit(company);
    expect(ids.size).toBeGreaterThan(1);
  });
});
