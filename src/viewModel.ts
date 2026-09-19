import type { BusinessNode as ReportNode } from './data';

export type ChannelType = 'existing' | 'organic' | 'paid';

export type BusinessNode =
  | {
      type: 'company';
      id: string;
      name: string;
      values: number[];
      channels: Channel[];
      branches: Branch[];
    }
  | {
      type: 'branch';
      id: string;
      name: string;
      values: number[];
      channels: Channel[];
      employees: Employee[];
    }
  | {
      type: 'employee';
      id: string;
      name: string;
      values: number[];
      channels: Channel[];
    }
  | {
      type: 'channel';
      id: string;
      name: string;
      channelType: ChannelType;
      values: number[];
    };

export type Company = Extract<BusinessNode, { type: 'company' }>;
export type Branch = Extract<BusinessNode, { type: 'branch' }>;
export type Employee = Extract<BusinessNode, { type: 'employee' }>;
export type Channel = Extract<BusinessNode, { type: 'channel' }>;
export type NodeKind = BusinessNode['type'];

function channelType(name: string): ChannelType {
  switch (name) {
    case 'Existing clients': return 'existing';
    case 'New organic': return 'organic';
    case 'New paid': return 'paid';
    default: throw new Error(`Unknown channel: ${name}`);
  }
}

function toChannel(node: ReportNode): Channel {
  return { type: 'channel', id: node.id, name: node.name,
    channelType: channelType(node.name), values: node.values };
}

function toEmployee(node: ReportNode): Employee {
  return { type: 'employee', id: node.id, name: node.name, values: node.values,
    channels: (node.channels ?? []).map(toChannel) };
}

function toBranch(node: ReportNode): Branch {
  return { type: 'branch', id: node.id, name: node.name, values: node.values,
    channels: (node.channels ?? []).map(toChannel),
    employees: (node.employees ?? []).map(toEmployee) };
}

export function toBusinessNode(node: ReportNode): Company {
  return { type: 'company', id: node.id, name: node.name, values: node.values,
    channels: (node.channels ?? []).map(toChannel),
    branches: (node.branches ?? []).map(toBranch) };
}

export function childrenOf(node: BusinessNode): BusinessNode[] {
  switch (node.type) {
    case 'company': return [...node.branches, ...node.channels];
    case 'branch': return [...node.employees, ...node.channels];
    case 'employee': return node.channels;
    case 'channel': return [];
  }
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

const channelSeries: Record<ChannelType, { id: string; color: string }> = {
  existing: { id: 'existing', color: 'var(--chart-existing-clients)' },
  organic: { id: 'organic', color: 'var(--chart-new-organic)' },
  paid: { id: 'paid', color: 'var(--chart-new-paid)' },
};

export function chartSeries(node: BusinessNode): ChartSeries[] {
  if (node.type === 'channel') return [{ ...channelSeries[node.channelType], name: node.name, values: node.values }];
  if (node.channels.length) return node.channels.map(channel => ({
    ...channelSeries[channel.channelType], name: channel.name, values: channel.values,
  }));

  return [{ id: 'total', name: 'Clients', values: node.values, color: 'var(--chart-total-clients)' }];
}
