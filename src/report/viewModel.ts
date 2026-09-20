import type { BusinessNode as ReportNode } from './data';

export type ChannelType = 'existing' | 'organic' | 'paid';

interface HierarchyState {
  hasChildren: boolean;
  childrenLoaded: boolean;
  childCount: number;
}

export type Company = HierarchyState & {
  type: 'company';
  id: string;
  name: string;
  values: number[];
  channels: Channel[];
  branches: Branch[];
};

export type Branch = HierarchyState & {
  type: 'branch';
  id: string;
  name: string;
  values: number[];
  channels: Channel[];
  employees: Employee[];
};

export type Employee = HierarchyState & {
  type: 'employee';
  id: string;
  name: string;
  values: number[];
  channels: Channel[];
};

export type Channel = HierarchyState & {
  type: 'channel';
  id: string;
  name: string;
  channelType: ChannelType;
  values: number[];
};

export type BusinessNode = Company | Branch | Employee | Channel;
export type NodeKind = BusinessNode['type'];

function channelType(name: string): ChannelType {
  switch (name) {
    case 'Existing clients': return 'existing';
    case 'New organic': return 'organic';
    case 'New paid': return 'paid';
    default: throw new Error(`Unknown channel: ${name}`);
  }
}

function hierarchyState(node: ReportNode, loadedChildCount: number): HierarchyState {
  const childCount = node.childCount ?? loadedChildCount;
  return {
    hasChildren: node.hasChildren ?? childCount > 0,
    childCount,
    childrenLoaded: node.childrenLoaded ?? loadedChildCount >= childCount,
  };
}

function toChannel(node: ReportNode): Channel {
  return {
    type: 'channel', id: node.id, name: node.name,
    channelType: channelType(node.name), values: node.values,
    hasChildren: false, childrenLoaded: true, childCount: 0,
  };
}

function toEmployee(node: ReportNode): Employee {
  const channels = (node.channels ?? []).map(toChannel);
  return {
    type: 'employee', id: node.id, name: node.name, values: node.values,
    channels, ...hierarchyState(node, channels.length),
  };
}

function toBranch(node: ReportNode): Branch {
  const channels = (node.channels ?? []).map(toChannel);
  const employees = (node.employees ?? []).map(toEmployee);
  return {
    type: 'branch', id: node.id, name: node.name, values: node.values,
    channels, employees, ...hierarchyState(node, channels.length + employees.length),
  };
}

export function toBusinessNode(node: ReportNode): Company {
  const channels = (node.channels ?? []).map(toChannel);
  const branches = (node.branches ?? []).map(toBranch);
  return {
    type: 'company', id: node.id, name: node.name, values: node.values,
    channels, branches, ...hierarchyState(node, channels.length + branches.length),
  };
}

export function childrenOf(node: BusinessNode): BusinessNode[] {
  switch (node.type) {
    case 'company': return [...node.branches, ...node.channels];
    case 'branch': return [...node.employees, ...node.channels];
    case 'employee': return node.channels;
    case 'channel': return [];
  }
}

export function hydrateBusinessNode(node: BusinessNode, payload: ReportNode): BusinessNode {
  switch (node.type) {
    case 'company': return toBusinessNode(payload);
    case 'branch': return toBranch(payload);
    case 'employee': return toEmployee(payload);
    case 'channel': return toChannel(payload);
  }
}

function appendUnique<T extends BusinessNode>(existing: T[], incoming: T[]): T[] {
  if (!incoming.length) return existing;
  const ids = new Set(existing.map(child => child.id));
  return [...existing, ...incoming.filter(child => !ids.has(child.id))];
}

function mergeChildPage(node: BusinessNode, payload: ReportNode): BusinessNode {
  const childCount = payload.childCount ?? node.childCount;
  const state = {
    hasChildren: payload.hasChildren ?? node.hasChildren,
    childCount,
    childrenLoaded: payload.childrenLoaded ?? node.childrenLoaded,
  };

  switch (node.type) {
    case 'company': {
      const branches = appendUnique(node.branches, (payload.branches ?? []).map(toBranch));
      const channels = appendUnique(node.channels, (payload.channels ?? []).map(toChannel));
      return { ...node, ...state, branches, channels };
    }
    case 'branch': {
      const employees = appendUnique(node.employees, (payload.employees ?? []).map(toEmployee));
      const channels = appendUnique(node.channels, (payload.channels ?? []).map(toChannel));
      return { ...node, ...state, employees, channels };
    }
    case 'employee': {
      const channels = appendUnique(node.channels, (payload.channels ?? []).map(toChannel));
      return { ...node, ...state, channels };
    }
    case 'channel': return node;
  }
}

function replaceNode(node: BusinessNode, targetId: string, payload: ReportNode, append: boolean): BusinessNode {
  if (node.id === targetId) return append ? mergeChildPage(node, payload) : hydrateBusinessNode(node, payload);

  switch (node.type) {
    case 'company': {
      const branches = node.branches.map(child => replaceNode(child, targetId, payload, append) as Branch);
      const channels = node.channels.map(child => replaceNode(child, targetId, payload, append) as Channel);
      return { ...node, branches, channels };
    }
    case 'branch': {
      const employees = node.employees.map(child => replaceNode(child, targetId, payload, append) as Employee);
      const channels = node.channels.map(child => replaceNode(child, targetId, payload, append) as Channel);
      return { ...node, employees, channels };
    }
    case 'employee': {
      const channels = node.channels.map(child => replaceNode(child, targetId, payload, append) as Channel);
      return { ...node, channels };
    }
    case 'channel': return node;
  }
}

export function replaceBusinessNode(root: Company, targetId: string, payload: ReportNode): Company {
  return replaceNode(root, targetId, payload, false) as Company;
}

export function appendBusinessNodePage(root: Company, targetId: string, payload: ReportNode): Company {
  return replaceNode(root, targetId, payload, true) as Company;
}

export interface VisibleNode {
  node: BusinessNode;
  level: number;
  parentId?: string;
  position: number;
  siblingCount: number;
  logicalIndex: number;
}

export function visibleNodes(root: BusinessNode, expanded: ReadonlySet<string>): VisibleNode[] {
  const rows: VisibleNode[] = [];
  let logicalIndex = 0;
  function visit(node: BusinessNode, level: number, parentId?: string, position = 1, siblingCount = 1) {
    rows.push({ node, level, parentId, position, siblingCount, logicalIndex });
    logicalIndex++;
    if (expanded.has(node.id)) {
      const children = childrenOf(node);
      const siblingCount = node.childCount || children.length;
      children.forEach((child, index) => visit(child, level + 1, node.id, index + 1, siblingCount));
      logicalIndex += Math.max(0, siblingCount - children.length);
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
