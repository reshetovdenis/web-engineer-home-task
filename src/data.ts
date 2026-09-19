export type NodeKind = 'company' | 'branch' | 'employee' | 'channel';

export interface BusinessNode {
  id: string;
  name: string;
  values: number[];
  branches?: BusinessNode[];
  employees?: BusinessNode[];
  channels?: BusinessNode[];
}

export function childrenOf(node: BusinessNode): BusinessNode[] {
  return node.branches ?? node.employees ?? node.channels ?? [];
}

export function kindOf(level: number): NodeKind {
  return (['company', 'branch', 'employee', 'channel'] as const)[Math.min(level, 3)];
}

export interface VisibleNode {
  node: BusinessNode;
  level: number;
  parentId?: string;
  position: number;
  siblingCount: number;
}

export function visibleNodes(root: BusinessNode, expanded: ReadonlySet<string>): VisibleNode[] {
  const rows: VisibleNode[] = [];
  function visit(node: BusinessNode, level: number, parentId?: string, position = 1, siblingCount = 1) {
    rows.push({ node, level, parentId, position, siblingCount });
    if (expanded.has(node.id)) {
      const children = childrenOf(node);
      children.forEach((child, index) => visit(child, level + 1, node.id, index + 1, children.length));
    }
  }
  visit(root, 0);
  return rows;
}

export interface ChartSeries {
  name: string;
  id: string;
  values: number[];
  color: string;
}

function channelValues(node: BusinessNode, name: string): number[] {
  if (node.name === name && !childrenOf(node).length) return node.values;
  const childValues = childrenOf(node).map(child => channelValues(child, name));
  return node.values.map((_, month) => childValues.reduce((sum, values) => sum + values[month], 0));
}

export function chartSeries(node: BusinessNode): ChartSeries[] {
  const organic = channelValues(node, 'New organic');
  const paid = channelValues(node, 'New paid');
  const existing = node.values.map((value, month) => value - organic[month] - paid[month]);
  return [
    { id: 'existing', name: 'Existing clients', values: existing, color: 'var(--chart-existing-clients)' },
    { id: 'organic', name: 'New organic', values: organic, color: 'var(--chart-new-organic)' },
    { id: 'paid', name: 'New paid', values: paid, color: 'var(--chart-new-paid)' },
  ];
}

export function hasDifferences(node: BusinessNode): boolean {
  const children = childrenOf(node);
  return children.length > 0 && node.values.some((value, index) => children.reduce((sum, child) => sum + child.values[index], 0) !== value);
}
