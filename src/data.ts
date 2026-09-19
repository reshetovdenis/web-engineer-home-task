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

const channelSeries = [
  { name: 'Existing clients', id: 'existing', color: 'var(--chart-existing-clients)' },
  { name: 'New organic', id: 'organic', color: 'var(--chart-new-organic)' },
  { name: 'New paid', id: 'paid', color: 'var(--chart-new-paid)' },
];

export function chartSeries(node: BusinessNode): ChartSeries[] {
  if (node.channels?.length) return node.channels.flatMap(channel => {
    const definition = channelSeries.find(series => series.name === channel.name);
    return definition ? [{ ...definition, values: channel.values }] : [];
  });

  const channel = channelSeries.find(series => series.name === node.name);
  if (channel && !childrenOf(node).length) return [{ ...channel, values: node.values }];

  return [{ id: 'total', name: 'Clients', values: node.values, color: 'var(--chart-total-clients)' }];
}

export function hasDifferences(node: BusinessNode): boolean {
  const children = childrenOf(node);
  return children.length > 0 && node.values.some((value, index) => children.reduce((sum, child) => sum + child.values[index], 0) !== value);
}
