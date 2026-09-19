import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { childrenOf, visibleNodes, type BusinessNode } from './viewModel';

interface Props {
  root: BusinessNode;
  selectedId: string;
  onSelect: (node: BusinessNode) => void;
  onLoadChildren?: (node: BusinessNode) => Promise<void>;
  labels: string[];
  detail?: 'year' | 'month' | 'day';
}

const ROW_HEIGHT = 55;
const HEADER_HEIGHT = 56;
const MAX_TABLE_HEIGHT = 660;
const VIRTUALIZE_AFTER = 40;
const ROW_OVERSCAN = 8;
const PAGE_PREFETCH_ROWS = 10;

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

function compactCount(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function HierarchyTable({ root, selectedId, onSelect, onLoadChildren, labels, detail = 'month' }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [monthCount, setMonthCount] = useState(() => visibleMonthCount(availableWidth(), labels.length));
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(MAX_TABLE_HEIGHT);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());
  const [loadErrors, setLoadErrors] = useState<Set<string>>(() => new Set());
  const panel = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const loadsInFlight = useRef(new Set<string>());
  const requestedOffsets = useRef(new Map<string, number>());
  const rows = useMemo(() => visibleNodes(root, expanded), [root, expanded]);
  const groupStarts = Array.from({ length: Math.ceil(labels.length / monthCount) }, (_, index) =>
    Math.min(index * monthCount, labels.length - monthCount));
  const firstMonth = groupStarts.filter(start => start <= selectedMonth).at(-1) ?? 0;
  const visibleLabels = labels.slice(firstMonth, firstMonth + monthCount);

  const isVirtualized = rows.length > VIRTUALIZE_AFTER;
  const bodyScrollTop = Math.max(0, scrollTop - HEADER_HEIGHT);
  const rawStart = isVirtualized ? Math.max(0, Math.floor(bodyScrollTop / ROW_HEIGHT) - ROW_OVERSCAN) : 0;
  const startIndex = Math.min(rawStart, Math.max(0, rows.length - 1));
  const rawEnd = isVirtualized
    ? Math.ceil((bodyScrollTop + viewportHeight) / ROW_HEIGHT) + ROW_OVERSCAN
    : rows.length;
  const endIndex = Math.min(rows.length, Math.max(startIndex + 1, rawEnd));
  const renderedRows = rows.slice(startIndex, endIndex);
  const rowIndexById = useMemo(() => new Map(rows.map((row, index) => [row.node.id, index])), [rows]);
  const knownVisibleRowCount = rows.length + rows.reduce((count, row) => {
    if (!expanded.has(row.node.id)) return count;
    return count + Math.max(0, row.node.childCount - childrenOf(row.node).length);
  }, 0);
  const topSpacer = isVirtualized ? startIndex * ROW_HEIGHT : 0;
  const bottomSpacer = isVirtualized ? Math.max(0, (rows.length - endIndex) * ROW_HEIGHT) : 0;

  useEffect(() => {
    requestedOffsets.current.clear();
    loadsInFlight.current.clear();
    setLoadingIds(new Set());
    setLoadErrors(new Set());
  }, [root.values]);

  useEffect(() => {
    const update = () => setMonthCount(visibleMonthCount(panel.current?.clientWidth || availableWidth(), labels.length));
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (panel.current) observer?.observe(panel.current);
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); };
  }, [labels.length]);

  useEffect(() => {
    const update = () => setViewportHeight(scroller.current?.clientHeight || MAX_TABLE_HEIGHT);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (scroller.current) observer?.observe(scroller.current);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!isVirtualized || !scroller.current) return;
    const maximum = Math.max(0, HEADER_HEIGHT + rows.length * ROW_HEIGHT - viewportHeight);
    if (scroller.current.scrollTop > maximum) {
      scroller.current.scrollTop = maximum;
      setScrollTop(maximum);
    }
  }, [isVirtualized, rows.length, viewportHeight]);

  const loadNode = useCallback(async (node: BusinessNode) => {
    if (!onLoadChildren || !node.hasChildren || node.childrenLoaded || loadsInFlight.current.has(node.id)) return;
    const loadedCount = childrenOf(node).length;
    if (requestedOffsets.current.get(node.id) === loadedCount) return;
    requestedOffsets.current.set(node.id, loadedCount);
    loadsInFlight.current.add(node.id);
    setLoadingIds(previous => new Set(previous).add(node.id));
    setLoadErrors(previous => {
      const next = new Set(previous);
      next.delete(node.id);
      return next;
    });
    try {
      await onLoadChildren(node);
    } catch {
      requestedOffsets.current.delete(node.id);
      setLoadErrors(previous => new Set(previous).add(node.id));
      if (loadedCount === 0) setExpanded(previous => {
        const next = new Set(previous);
        next.delete(node.id);
        return next;
      });
    } finally {
      loadsInFlight.current.delete(node.id);
      setLoadingIds(previous => {
        const next = new Set(previous);
        next.delete(node.id);
        return next;
      });
    }
  }, [onLoadChildren]);

  useEffect(() => {
    for (const row of rows) {
      const { node } = row;
      if (!expanded.has(node.id) || !node.hasChildren || node.childrenLoaded || loadErrors.has(node.id)) continue;

      const children = childrenOf(node);
      if (children.length === 0) {
        void loadNode(node);
        continue;
      }

      const lastChildIndex = rowIndexById.get(children.at(-1)!.id);
      if (lastChildIndex === undefined) continue;

      const childLevel = row.level + 1;
      let subtreeEnd = rows.length - 1;
      for (let index = lastChildIndex + 1; index < rows.length; index++) {
        if (rows[index].level <= childLevel) {
          subtreeEnd = index - 1;
          break;
        }
      }

      if (endIndex >= subtreeEnd - PAGE_PREFETCH_ROWS) void loadNode(node);
    }
  }, [endIndex, expanded, loadErrors, loadNode, rowIndexById, rows]);

  function toggle(node: BusinessNode) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    if (!expanded.has(node.id) && loadErrors.has(node.id)) {
      setLoadErrors(previous => {
        const next = new Set(previous);
        next.delete(node.id);
        return next;
      });
    }
  }

  function focusRow(index: number) {
    const target = rows[index];
    if (!target) return;
    const focus = () => buttons.current.get(target.node.id)?.focus();

    if (!isVirtualized || index >= startIndex && index < endIndex) {
      focus();
      return;
    }

    const element = scroller.current;
    if (!element) return;
    const rowTop = HEADER_HEIGHT + index * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    let nextScrollTop = element.scrollTop;
    if (rowTop < element.scrollTop + HEADER_HEIGHT) nextScrollTop = Math.max(0, rowTop - HEADER_HEIGHT);
    else if (rowBottom > element.scrollTop + viewportHeight) nextScrollTop = rowBottom - viewportHeight;
    element.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);

    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0);
    schedule(() => schedule(() => focus()));
  }

  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = rows[index];
    const hasChildren = row.node.hasChildren;
    switch (event.key) {
      case 'ArrowDown': focusRow(index + 1); break;
      case 'ArrowUp': focusRow(index - 1); break;
      case 'Home': focusRow(0); break;
      case 'End': focusRow(rows.length - 1); break;
      case 'ArrowRight':
        if (hasChildren && !expanded.has(row.node.id)) toggle(row.node);
        else if (hasChildren && childrenOf(row.node).length > 0) focusRow(index + 1);
        break;
      case 'ArrowLeft':
        if (hasChildren && expanded.has(row.node.id)) toggle(row.node);
        else if (row.parentId) {
          const parentIndex = rows.findIndex(candidate => candidate.node.id === row.parentId);
          focusRow(parentIndex);
        }
        break;
      default: return;
    }
    event.preventDefault();
  }

  return <section ref={panel} className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white" aria-label="Client breakdown" style={{ '--visible-months': monthCount } as React.CSSProperties}>
    {monthCount < labels.length && <div className="flex items-center justify-between gap-3 px-4 pt-4 text-sm">
      <label htmlFor="table-month">{detail === 'year' ? 'Years' : detail === 'day' ? 'Days' : 'Months'}</label>
      <select className="h-10 min-w-0 max-w-full rounded border border-ink/20 bg-white px-3 font-[inherit] text-ink" id="table-month" value={firstMonth} onChange={event => setSelectedMonth(Number(event.target.value))}>
        {groupStarts.map(start => <option key={start} value={start}>
          {detail === 'month' ? labels[start].replace(' ', ' 20') : labels[start]}{monthCount > 1 && ` – ${detail === 'month' ? labels[start + monthCount - 1].replace(' ', ' 20') : labels[start + monthCount - 1]}`}
        </option>)}
      </select>
    </div>}
    <div ref={scroller} className="max-h-[660px] w-full overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6] max-[1440px]:overflow-x-hidden" tabIndex={0} aria-label="Client breakdown table"
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <table className={`w-full table-fixed border-collapse text-sm leading-5 tabular-nums max-[1440px]:min-w-0 max-[1440px]:[--label-width:280px] max-[601px]:[--label-width:250px] max-[421px]:[--label-width:calc(100%_-_92px)] ${labels.length >= 12 ? 'min-w-[1408px]' : 'min-w-0'}`} role="treegrid" aria-label={`Client breakdown by ${detail}`} aria-rowcount={knownVisibleRowCount + 1}>
        <thead><tr><th className="sticky top-0 left-0 z-30 h-14 w-[280px] border-b border-ink/8 bg-white p-0 text-right font-normal whitespace-nowrap text-ink/60 max-[1440px]:left-auto max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="col"><span className="sr-only">Business unit</span></th>{visibleLabels.map(label => <th scope="col" key={label} className="month-column month-current sticky top-0 z-20 h-14 w-[92px] border-b border-ink/8 bg-white p-0 pl-4 text-right font-normal whitespace-nowrap text-ink/60 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:last:pr-4">{detail === 'month' ? label.replace(' ', ' 20') : label}</th>)}</tr></thead>
        <tbody>
          {topSpacer > 0 && <tr aria-hidden="true"><td className="border-0 p-0" colSpan={visibleLabels.length + 1} style={{ height: topSpacer }} /></tr>}
          {renderedRows.map((row, offset) => {
            const index = startIndex + offset;
            const hasChildren = row.node.hasChildren;
            const isExpanded = expanded.has(row.node.id);
            const isSelected = selectedId === row.node.id;
            const isLoading = loadingIds.has(row.node.id);
            const loadedChildCount = childrenOf(row.node).length;
            const loadFailed = loadErrors.has(row.node.id);
            const kind = row.node.type;
            return <tr className="group" key={row.node.id} data-row-index={index} aria-rowindex={row.logicalIndex + 2} aria-level={row.level + 1} aria-posinset={row.position} aria-setsize={row.siblingCount} aria-expanded={hasChildren ? isExpanded : undefined}>
              <th className="sticky left-0 z-10 h-[55px] w-[280px] border-b border-ink/8 bg-white p-0 text-left font-normal whitespace-nowrap group-hover:bg-ink/4 max-[1440px]:left-auto max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="row"><div className="flex h-[55px] min-w-0 items-center gap-2 overflow-hidden pr-2 ps-[calc(var(--level)*28px+16px)] max-[601px]:ps-[calc(var(--level)*14px+12px)]" style={{ '--level': row.level } as React.CSSProperties}>
                {hasChildren ? <button ref={element => { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); }} className="grid h-5 w-4 flex-none cursor-pointer place-items-center border-0 bg-transparent p-0 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" aria-expanded={isExpanded} aria-busy={isLoading || undefined} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`} title={loadFailed ? `Could not load ${row.node.name}. Activate to retry.` : undefined} onClick={() => toggle(row.node)} onKeyDown={event => onRowKeyDown(event, index)}><span className={`size-[6px] border-r-[1.5px] border-b-[1.5px] border-current transition-transform duration-150 ${isExpanded ? 'rotate-45' : '-rotate-45'}`} aria-hidden="true" /></button> : <span className="w-4 flex-none" aria-hidden="true" />}
                {kind === 'employee' && <EmployeeAvatar id={row.node.id} name={row.node.name} />}
                <button ref={element => { if (!hasChildren) { if (element) buttons.current.set(row.node.id, element); else buttons.current.delete(row.node.id); } }} type="button" className="min-w-0 flex-1 cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left font-normal whitespace-nowrap text-ellipsis text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" title={row.node.name} aria-current={isSelected ? 'true' : undefined} aria-label={`${row.node.name}, ${kind}, level ${row.level + 1}${row.parentId ? ', child row' : ''}; show in chart`} onClick={() => onSelect(row.node)} onKeyDown={event => onRowKeyDown(event, index)}>{row.node.name}</button>
                {isExpanded && hasChildren && !row.node.childrenLoaded && <>
                  <span className="ml-auto flex-none text-xs text-ink/45 max-[601px]:hidden" aria-hidden="true">{isLoading ? 'Loading…' : `${loadedChildCount.toLocaleString()} / ${row.node.childCount.toLocaleString()} loaded`}</span>
                  <span className="ml-auto hidden flex-none text-xs text-ink/45 max-[601px]:inline" aria-hidden="true">{isLoading ? 'Loading…' : `${compactCount(loadedChildCount)} / ${compactCount(row.node.childCount)}`}</span>
                  <span className="sr-only">{isLoading ? `Loading children for ${row.node.name}` : `${loadedChildCount.toLocaleString()} of ${row.node.childCount.toLocaleString()} children loaded`}</span>
                </>}
                {loadFailed && <span className="sr-only" role="alert">Couldn’t load children for {row.node.name}. Activate expand to retry.</span>}
              </div></th>
              {row.node.values.slice(firstMonth, firstMonth + monthCount).map((value, month) => <td key={firstMonth + month} className="month-column month-current h-[55px] w-[92px] border-b border-ink/8 bg-white p-0 pl-4 text-right text-ink group-hover:bg-ink/4 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-months))] max-[1440px]:last:pr-4">{value.toLocaleString()}</td>)}
            </tr>;
          })}
          {bottomSpacer > 0 && <tr aria-hidden="true"><td className="border-0 p-0" colSpan={visibleLabels.length + 1} style={{ height: bottomSpacer }} /></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
