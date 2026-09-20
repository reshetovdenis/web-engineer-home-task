import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { childrenOf, type BusinessNode, type VisibleNode } from '../../report/viewModel';

const ROW_HEIGHT = 55;
const HEADER_HEIGHT = 56;
const MAX_TABLE_HEIGHT = 660;
const VIRTUALIZE_AFTER = 40;
const ROW_OVERSCAN = 8;

function rowWindow(rowCount: number, scrollTop: number, viewportHeight: number) {
  const isVirtualized = rowCount > VIRTUALIZE_AFTER;
  const bodyScrollTop = Math.max(0, scrollTop - HEADER_HEIGHT);
  const rawStart = isVirtualized ? Math.max(0, Math.floor(bodyScrollTop / ROW_HEIGHT) - ROW_OVERSCAN) : 0;
  const startIndex = Math.min(rawStart, Math.max(0, rowCount - 1));
  const rawEnd = isVirtualized
    ? Math.ceil((bodyScrollTop + viewportHeight) / ROW_HEIGHT) + ROW_OVERSCAN
    : rowCount;
  const endIndex = Math.min(rowCount, Math.max(startIndex + 1, rawEnd));
  return {
    isVirtualized,
    startIndex,
    endIndex,
    topSpacer: isVirtualized ? startIndex * ROW_HEIGHT : 0,
    bottomSpacer: isVirtualized ? Math.max(0, (rowCount - endIndex) * ROW_HEIGHT) : 0,
  };
}

export function useWindowedTreeRows(rows: VisibleNode[], expanded: ReadonlySet<string>, toggle: (node: BusinessNode) => void) {
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(MAX_TABLE_HEIGHT);
  const { isVirtualized, startIndex, endIndex, topSpacer, bottomSpacer } = rowWindow(rows.length, scrollTop, viewportHeight);
  const renderedRows = rows.slice(startIndex, endIndex);
  const knownVisibleRowCount = rows.length + rows.reduce((count, row) => {
    if (!expanded.has(row.node.id)) return count;
    return count + Math.max(0, row.node.childCount - childrenOf(row.node).length);
  }, 0);

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

  function registerButton(id: string, element: HTMLButtonElement | null) {
    if (element) buttons.current.set(id, element);
    else buttons.current.delete(id);
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

  function onRowKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
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

  return { scroller, setScrollTop, startIndex, endIndex, renderedRows, knownVisibleRowCount, topSpacer, bottomSpacer, registerButton, onRowKeyDown };
}
