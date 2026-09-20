import type { CSSProperties, KeyboardEvent } from 'react';
import { EmployeeAvatar } from './EmployeeAvatar';
import type { BusinessNode, VisibleNode } from './viewModel';

interface Props {
  row: VisibleNode;
  index: number;
  firstPeriod: number;
  periodCount: number;
  isExpanded: boolean;
  isSelected: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  onToggle: (node: BusinessNode) => void;
  onSelect: (node: BusinessNode) => void;
  onRowKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  registerButton: (id: string, element: HTMLButtonElement | null) => void;
}

export function HierarchyTableRow({ row, index, firstPeriod, periodCount, isExpanded, isSelected, isLoading, loadFailed, onToggle, onSelect, onRowKeyDown, registerButton }: Props) {
  const hasChildren = row.node.hasChildren;
  const kind = row.node.type;
  return <tr className="group" data-row-index={index} aria-rowindex={row.logicalIndex + 2} aria-level={row.level + 1} aria-posinset={row.position} aria-setsize={row.siblingCount} aria-expanded={hasChildren ? isExpanded : undefined}>
    <th className="sticky left-0 z-10 h-[55px] w-[280px] border-b border-ink/8 bg-white p-0 text-left font-normal whitespace-nowrap group-hover:bg-ink/4 max-[1440px]:left-auto max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="row"><div className="flex h-[55px] min-w-0 items-center gap-2 overflow-hidden pr-2 ps-[calc(var(--level)*28px+16px)] max-[601px]:ps-[calc(var(--level)*14px+12px)]" style={{ '--level': row.level } as CSSProperties}>
      {hasChildren ? <button ref={element => registerButton(row.node.id, element)} className="grid h-5 w-4 flex-none cursor-pointer place-items-center border-0 bg-transparent p-0 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" aria-expanded={isExpanded} aria-busy={isLoading || undefined} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`} title={loadFailed ? `Could not load ${row.node.name}. Activate to retry.` : undefined} onClick={() => onToggle(row.node)} onKeyDown={event => onRowKeyDown(event, index)}><span className={`size-[6px] border-r-[1.5px] border-b-[1.5px] border-current transition-transform duration-150 ${isExpanded ? 'rotate-45' : '-rotate-45'}`} aria-hidden="true" /></button> : <span className="w-4 flex-none" aria-hidden="true" />}
      {kind === 'employee' && <EmployeeAvatar id={row.node.id} name={row.node.name} />}
      <button ref={element => { if (!hasChildren) registerButton(row.node.id, element); }} type="button" className="min-w-0 flex-1 cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left font-normal whitespace-nowrap text-ellipsis text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" title={row.node.name} aria-current={isSelected ? 'true' : undefined} aria-label={`${row.node.name}, ${kind}, level ${row.level + 1}${row.parentId ? ', child row' : ''}; show in chart`} onClick={() => onSelect(row.node)} onKeyDown={event => onRowKeyDown(event, index)}>{row.node.name}</button>
    </div></th>
    {row.node.values.slice(firstPeriod, firstPeriod + periodCount).map((value, offset) => <td key={firstPeriod + offset} className="month-column month-current h-[55px] w-[92px] border-b border-ink/8 bg-white p-0 pl-4 text-right text-ink group-hover:bg-ink/4 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-periods))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-periods))] max-[1440px]:last:pr-4">{value.toLocaleString()}</td>)}
  </tr>;
}
