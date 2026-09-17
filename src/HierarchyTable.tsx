import { useEffect, useMemo, useRef, useState } from 'react';
import { childrenOf, kindOf, months, visibleNodes, type BusinessNode } from './data';

interface Props {
  root: BusinessNode;
  selectedId: string;
  onSelect: (node: BusinessNode) => void;
}

function availableWidth() {
  if (typeof window === 'undefined') return 1408;
  return Math.min(1408, window.innerWidth - (window.innerWidth <= 600 ? 24 : 32));
}

function visibleMonthCount(width: number) {
  const labelWidth = typeof window !== 'undefined' && window.innerWidth <= 600 ? 200 : 280;
  return Math.max(1, Math.min(months.length, Math.floor((width - labelWidth) / 92)));
}

export function HierarchyTable({ root, selectedId, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [monthCount, setMonthCount] = useState(() => visibleMonthCount(availableWidth()));
  const panel = useRef<HTMLElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const rows = useMemo(() => visibleNodes(root, expanded), [root, expanded]);
  const groupStarts = Array.from({ length: Math.ceil(months.length / monthCount) }, (_, index) =>
    Math.min(index * monthCount, months.length - monthCount));
  const firstMonth = groupStarts.filter(start => start <= selectedMonth).at(-1) ?? 0;

  useEffect(() => {
    const update = () => setMonthCount(visibleMonthCount(panel.current?.clientWidth || availableWidth()));
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (panel.current) observer?.observe(panel.current);
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); };
  }, []);

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

  return <section ref={panel} className="table-panel" aria-label="Client breakdown" style={{ '--visible-months': monthCount } as React.CSSProperties}>
    {monthCount < months.length && <div className="month-control">
      <label htmlFor="table-month">Months</label>
      <select id="table-month" value={firstMonth} onChange={event => setSelectedMonth(Number(event.target.value))}>
        {groupStarts.map(start => <option key={start} value={start}>
          {months[start].replace(' ', ' 20')}{monthCount > 1 && ` – ${months[start + monthCount - 1].replace(' ', ' 20')}`}
        </option>)}
      </select>
    </div>}
    <div className="table-scroll" tabIndex={0} aria-label="Client breakdown table">
      <table role="treegrid" aria-label="Client breakdown by month">
        <thead><tr><th scope="col"><span className="sr-only">Business unit</span></th>{months.map((month, index) => <th scope="col" key={month} className={`month-column${index >= firstMonth && index < firstMonth + monthCount ? ' month-current' : ''}`}>{month.replace(' ', ' 20')}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => {
          const children = childrenOf(row.node);
          const isExpanded = expanded.has(row.node.id);
          const isSelected = selectedId === row.node.id;
          const kind = kindOf(row.level);
          return <tr key={row.node.id} aria-level={row.level + 1} aria-posinset={row.position} aria-setsize={row.siblingCount} aria-expanded={children.length ? isExpanded : undefined}>
            <th scope="row"><div className="row-label" style={{ '--level': row.level } as React.CSSProperties}>
              {children.length ? <button ref={element => { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); }} className="expand-button" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`} onClick={() => toggle(row.node.id)} onKeyDown={event => onRowKeyDown(event, index)}><span className={`chevron ${isExpanded ? 'opened' : ''}`} aria-hidden="true" /></button> : <span className="leaf-indicator" aria-hidden="true" />}
              <button ref={element => { if (!children.length) { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); } }} type="button" className="name-button" aria-current={isSelected ? 'true' : undefined} aria-label={`${row.node.name}, ${kind}, level ${row.level + 1}${row.parentId ? ', child row' : ''}; show in chart`} onClick={() => onSelect(row.node)} onKeyDown={event => onRowKeyDown(event, index)}>{row.node.name}</button>
            </div></th>
            {row.node.values.map((value, month) => <td key={month} className={`month-column${month >= firstMonth && month < firstMonth + monthCount ? ' month-current' : ''}`}>{value.toLocaleString()}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
