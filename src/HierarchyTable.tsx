import { useEffect, useMemo, useRef, useState } from 'react';
import { childrenOf, kindOf, months, visibleNodes, type BusinessNode } from './data';

interface Props {
  root: BusinessNode;
  selectedId: string;
  onSelect: (node: BusinessNode) => void;
  labels?: string[];
  detail?: 'year' | 'month' | 'day';
}

function availableWidth() {
  if (typeof window === 'undefined') return 1408;
  return Math.min(1408, window.innerWidth - (window.innerWidth <= 600 ? 24 : 32));
}

function visibleMonthCount(width: number, labelCount: number) {
  const labelWidth = typeof window !== 'undefined' && window.innerWidth <= 420 ? width - 92
    : typeof window !== 'undefined' && window.innerWidth <= 600 ? 250 : 280;
  return Math.max(1, Math.min(labelCount, Math.floor((width - labelWidth) / 92)));
}

function EmployeeAvatar({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const parts = name.trim().split(/\s+/);
    const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toLocaleUpperCase();
    return <span className="employee-avatar-fallback grid size-5 flex-none place-items-center rounded-full bg-[#e6defd] text-[10px]/none font-semibold text-[#5c438b]" aria-hidden="true">{initials}</span>;
  }
  return <img className="employee-avatar block size-5 flex-none rounded-full object-cover" src={`/api/avatars/${id}.jpg`} alt="" width="20" height="20"
    loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function HierarchyTable({ root, selectedId, onSelect, labels = months, detail = 'month' }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [monthCount, setMonthCount] = useState(() => visibleMonthCount(availableWidth(), labels.length));
  const panel = useRef<HTMLElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const rows = useMemo(() => visibleNodes(root, expanded), [root, expanded]);
  const groupStarts = Array.from({ length: Math.ceil(labels.length / monthCount) }, (_, index) =>
    Math.min(index * monthCount, labels.length - monthCount));
  const firstMonth = groupStarts.filter(start => start <= selectedMonth).at(-1) ?? 0;

  useEffect(() => {
    const update = () => setMonthCount(visibleMonthCount(panel.current?.clientWidth || availableWidth(), labels.length));
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (panel.current) observer?.observe(panel.current);
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); };
  }, [labels.length]);

  function toggle(id: string) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = rows[index];
    const childCount = childrenOf(row.node).length;
    let focusId: string | undefined;
    switch (event.key) {
      case 'ArrowDown': focusId = rows[index + 1]?.node.id; break;
      case 'ArrowUp': focusId = rows[index - 1]?.node.id; break;
      case 'Home': focusId = rows[0]?.node.id; break;
      case 'End': focusId = rows.at(-1)?.node.id; break;
      case 'ArrowRight':
        if (childCount && !expanded.has(row.node.id)) toggle(row.node.id);
        else if (childCount) focusId = rows[index + 1]?.node.id;
        break;
      case 'ArrowLeft':
        if (childCount && expanded.has(row.node.id)) toggle(row.node.id);
        else focusId = row.parentId;
        break;
      default: return;
    }
    event.preventDefault();
    if (focusId) buttons.current.get(focusId)?.focus();
  }

  const monthClass = (current: boolean) => current
    ? 'month-column month-current table-cell'
    : 'month-column hidden';

  return <section ref={panel} className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white" aria-label="Client breakdown" style={{ '--visible-months': monthCount } as React.CSSProperties}>
    {monthCount < labels.length && <div className="flex items-center justify-between gap-3 px-4 pt-4 text-sm">
      <label htmlFor="table-month">{detail === 'year' ? 'Years' : detail === 'day' ? 'Days' : 'Months'}</label>
      <select className="h-10 min-w-0 max-w-full rounded border border-ink/20 bg-white px-3 font-[inherit] text-ink" id="table-month" value={firstMonth} onChange={event => setSelectedMonth(Number(event.target.value))}>
        {groupStarts.map(start => <option key={start} value={start}>
          {detail === 'month' ? labels[start].replace(' ', ' 20') : labels[start]}{monthCount > 1 && ` – ${detail === 'month' ? labels[start + monthCount - 1].replace(' ', ' 20') : labels[start + monthCount - 1]}`}
        </option>)}
      </select>
    </div>}
    <div className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6] max-[1440px]:overflow-x-hidden" tabIndex={0} aria-label="Client breakdown table">
      <table className={`w-full table-fixed border-collapse text-sm leading-5 tabular-nums max-[1440px]:min-w-0 max-[1440px]:[--label-width:280px] max-[601px]:[--label-width:250px] max-[421px]:[--label-width:calc(100%_-_92px)] ${labels.length >= months.length ? 'min-w-[1408px]' : 'min-w-0'}`} role="treegrid" aria-label={`Client breakdown by ${detail}`}>
        <thead><tr><th className="sticky left-0 z-20 h-14 w-[280px] border-b border-ink/8 bg-white p-0 text-right font-normal whitespace-nowrap text-ink/60 max-[1440px]:static max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="col"><span className="sr-only">Business unit</span></th>{labels.map((label, index) => <th scope="col" key={label} className={`${monthClass(index >= firstMonth && index < firstMonth + monthCount)} h-14 w-[92px] border-b border-ink/8 p-0 pl-4 text-right font-normal whitespace-nowrap text-ink/60 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:last:pr-4`}>{detail === 'month' ? label.replace(' ', ' 20') : label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => {
          const children = childrenOf(row.node);
          const isExpanded = expanded.has(row.node.id);
          const isSelected = selectedId === row.node.id;
          const kind = kindOf(row.level);
          return <tr className="group" key={row.node.id} aria-level={row.level + 1} aria-posinset={row.position} aria-setsize={row.siblingCount} aria-expanded={children.length ? isExpanded : undefined}>
            <th className="sticky left-0 z-10 h-[55px] w-[280px] border-b border-ink/8 bg-white p-0 text-left font-normal whitespace-nowrap group-hover:bg-ink/4 max-[1440px]:static max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="row"><div className="flex h-[55px] items-center gap-2 pr-2 ps-[calc(var(--level)*28px+16px)] max-[1440px]:min-w-0 max-[601px]:ps-[calc(var(--level)*14px+12px)]" style={{ '--level': row.level } as React.CSSProperties}>
              {children.length ? <button ref={element => { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); }} className="grid h-5 w-4 flex-none cursor-pointer place-items-center border-0 bg-transparent p-0 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`} onClick={() => toggle(row.node.id)} onKeyDown={event => onRowKeyDown(event, index)}><span className={`size-[6px] border-r-[1.5px] border-b-[1.5px] border-current transition-transform duration-150 ${isExpanded ? 'rotate-45' : '-rotate-45'}`} aria-hidden="true" /></button> : <span className="w-4 flex-none" aria-hidden="true" />}
              {kind === 'employee' && <EmployeeAvatar id={row.node.id} name={row.node.name} />}
              <button ref={element => { if (!children.length) { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); } }} type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-normal whitespace-nowrap text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6] max-[1440px]:min-w-0 max-[1440px]:overflow-hidden max-[1440px]:text-ellipsis max-[601px]:whitespace-normal max-[601px]:text-clip" aria-current={isSelected ? 'true' : undefined} aria-label={`${row.node.name}, ${kind}, level ${row.level + 1}${row.parentId ? ', child row' : ''}; show in chart`} onClick={() => onSelect(row.node)} onKeyDown={event => onRowKeyDown(event, index)}>{row.node.name}</button>
            </div></th>
            {row.node.values.map((value, month) => <td key={month} className={`${monthClass(month >= firstMonth && month < firstMonth + monthCount)} h-[55px] w-[92px] border-b border-ink/8 bg-white p-0 pl-4 text-right text-ink group-hover:bg-ink/4 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:last:pr-4`}>{value.toLocaleString()}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
