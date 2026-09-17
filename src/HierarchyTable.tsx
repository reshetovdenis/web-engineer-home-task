import { useMemo, useRef, useState } from 'react';
import { childrenOf, kindOf, months, visibleNodes, type BusinessNode } from './data';

interface Props {
  root: BusinessNode;
  selectedId: string;
  onSelect: (node: BusinessNode) => void;
}

export function HierarchyTable({ root, selectedId, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const rows = useMemo(() => visibleNodes(root, expanded), [root, expanded]);

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

  return <section className="table-panel" aria-label="Client breakdown">
    <div className="table-scroll" tabIndex={0} aria-label="Scroll client breakdown horizontally to see all months">
      <table role="treegrid" aria-label="Client breakdown by month">
        <thead><tr><th scope="col"><span className="sr-only">Business unit</span></th>{months.map(month => <th scope="col" key={month}>{month.replace(' ', ' 20')}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => {
          const children = childrenOf(row.node);
          const isExpanded = expanded.has(row.node.id);
          const isSelected = selectedId === row.node.id;
          const kind = kindOf(row.level);
          return <tr key={row.node.id} aria-level={row.level + 1} aria-posinset={row.position} aria-setsize={row.siblingCount} aria-expanded={children.length ? isExpanded : undefined}>
            <th scope="row"><div className="row-label" style={{ paddingInlineStart: `${row.level * 28 + 16}px` }}>
              {children.length ? <button ref={element => { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); }} className="expand-button" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`} onClick={() => toggle(row.node.id)} onKeyDown={event => onRowKeyDown(event, index)}><span className={`chevron ${isExpanded ? 'opened' : ''}`} aria-hidden="true" /></button> : <span className="leaf-indicator" aria-hidden="true" />}
              <button ref={element => { if (!children.length) { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); } }} type="button" className="name-button" aria-current={isSelected ? 'true' : undefined} aria-label={`${row.node.name}, ${kind}, level ${row.level + 1}${row.parentId ? ', child row' : ''}; show in chart`} onClick={() => onSelect(row.node)} onKeyDown={event => onRowKeyDown(event, index)}>{row.node.name}</button>
            </div></th>
            {row.node.values.map((value, month) => <td key={month}>{value.toLocaleString()}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
