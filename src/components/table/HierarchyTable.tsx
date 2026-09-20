import { useMemo, useState, type CSSProperties } from 'react';
import { ErrorOverlay } from '../ErrorOverlay';
import { HierarchyTableRow } from './HierarchyTableRow';
import { useChildPageLoading } from './useChildPageLoading';
import { useTableColumns } from './useTableColumns';
import { useWindowedTreeRows } from './useWindowedTreeRows';
import { visibleNodes, type BusinessNode } from '../../report/viewModel';

interface Props {
  root: BusinessNode;
  selectedId: string;
  onSelect: (node: BusinessNode) => void;
  onLoadChildren?: (node: BusinessNode) => Promise<void>;
  labels: string[];
  detail?: 'year' | 'month' | 'day';
}

export function HierarchyTable({ root, selectedId, onSelect, onLoadChildren, labels, detail = 'month' }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
  const rows = useMemo(() => visibleNodes(root, expanded), [root, expanded]);
  const { panel, periodCount, groupStarts, firstPeriod, visibleLabels, setSelectedPeriod } = useTableColumns(labels);

  function toggle(node: BusinessNode) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    if (!expanded.has(node.id) && loadErrors.has(node.id)) clearLoadError(node.id);
  }

  const { scroller, setScrollTop, startIndex, endIndex, renderedRows, knownVisibleRowCount, topSpacer, bottomSpacer, registerButton, onRowKeyDown } =
    useWindowedTreeRows(rows, expanded, toggle);
  const { loadingIds, loadErrors, activeLoadError, failedNode, loadNode, clearLoadError } =
    useChildPageLoading(root, rows, expanded, setExpanded, endIndex, onLoadChildren);

  return <>
    {activeLoadError && failedNode && <ErrorOverlay
      title={`Couldn’t load children for ${failedNode.name}`}
      message={activeLoadError[1]}
      onRetry={() => void loadNode(failedNode)}
    />}
    <section ref={panel} className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white" aria-label="Client breakdown" style={{ '--visible-periods': periodCount } as CSSProperties}>
    {periodCount < labels.length && <div className="flex items-center justify-between gap-3 px-4 pt-4 text-sm">
      <label htmlFor="table-period">{detail === 'year' ? 'Years' : detail === 'day' ? 'Days' : 'Months'}</label>
      <select className="h-10 min-w-0 max-w-full rounded border border-ink/20 bg-white px-3 font-[inherit] text-ink" id="table-period" value={firstPeriod} onChange={event => setSelectedPeriod(Number(event.target.value))}>
        {groupStarts.map(start => <option key={start} value={start}>
          {detail === 'month' ? labels[start].replace(' ', ' 20') : labels[start]}{periodCount > 1 && ` – ${detail === 'month' ? labels[start + periodCount - 1].replace(' ', ' 20') : labels[start + periodCount - 1]}`}
        </option>)}
      </select>
    </div>}
    <div ref={scroller} className="max-h-[660px] w-full overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6] max-[1440px]:overflow-x-hidden" tabIndex={0} aria-label="Client breakdown table"
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <table className={`w-full table-fixed border-collapse text-sm leading-5 tabular-nums max-[1440px]:min-w-0 max-[1440px]:[--label-width:280px] max-[601px]:[--label-width:250px] max-[421px]:[--label-width:calc(100%_-_92px)] ${labels.length >= 12 ? 'min-w-[1408px]' : 'min-w-0'}`} role="treegrid" aria-label={`Client breakdown by ${detail}`} aria-rowcount={knownVisibleRowCount + 1}>
        <thead><tr><th className="sticky top-0 left-0 z-30 h-14 w-[280px] border-b border-ink/8 bg-white p-0 text-right font-normal whitespace-nowrap text-ink/60 max-[1440px]:left-auto max-[601px]:w-[250px] max-[421px]:w-[calc(100%_-_92px)]" scope="col"><span className="sr-only">Business unit</span></th>{visibleLabels.map(label => <th scope="col" key={label} className="month-column month-current sticky top-0 z-20 h-14 w-[92px] border-b border-ink/8 bg-white p-0 pl-4 text-right font-normal whitespace-nowrap text-ink/60 last:w-[116px] last:pr-6 max-[1440px]:w-[calc((100%_-_var(--label-width))/var(--visible-periods))] max-[1440px]:pl-2 max-[1440px]:pr-4 max-[1440px]:last:w-[calc((100%_-_var(--label-width))/var(--visible-periods))] max-[1440px]:last:pr-4">{detail === 'month' ? label.replace(' ', ' 20') : label}</th>)}</tr></thead>
        <tbody>
          {topSpacer > 0 && <tr aria-hidden="true"><td className="border-0 p-0" colSpan={visibleLabels.length + 1} style={{ height: topSpacer }} /></tr>}
          {renderedRows.map((row, offset) => <HierarchyTableRow
            key={row.node.id}
            row={row}
            index={startIndex + offset}
            firstPeriod={firstPeriod}
            periodCount={periodCount}
            isExpanded={expanded.has(row.node.id)}
            isSelected={selectedId === row.node.id}
            isLoading={loadingIds.has(row.node.id)}
            loadFailed={loadErrors.has(row.node.id)}
            onToggle={toggle}
            onSelect={onSelect}
            onRowKeyDown={onRowKeyDown}
            registerButton={registerButton}
          />)}
          {bottomSpacer > 0 && <tr aria-hidden="true"><td className="border-0 p-0" colSpan={visibleLabels.length + 1} style={{ height: bottomSpacer }} /></tr>}
        </tbody>
      </table>
    </div>
    </section>
  </>;
}
