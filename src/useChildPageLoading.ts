import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { childrenOf, type BusinessNode, type VisibleNode } from './viewModel';

const PAGE_PREFETCH_ROWS = 10;

function shouldPrefetch(row: VisibleNode, rows: VisibleNode[], rowIndexById: ReadonlyMap<string, number>, endIndex: number) {
  const children = childrenOf(row.node);
  if (children.length === 0) return true;

  const lastChildIndex = rowIndexById.get(children.at(-1)!.id);
  if (lastChildIndex === undefined) return false;

  const childLevel = row.level + 1;
  let subtreeEnd = rows.length - 1;
  for (let index = lastChildIndex + 1; index < rows.length; index++) {
    if (rows[index].level <= childLevel) {
      subtreeEnd = index - 1;
      break;
    }
  }
  return endIndex >= subtreeEnd - PAGE_PREFETCH_ROWS;
}

export function useChildPageLoading(
  root: BusinessNode,
  rows: VisibleNode[],
  expanded: ReadonlySet<string>,
  setExpanded: Dispatch<SetStateAction<Set<string>>>,
  endIndex: number,
  onLoadChildren?: (node: BusinessNode) => Promise<void>,
) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());
  const [loadErrors, setLoadErrors] = useState<Map<string, string>>(() => new Map());
  const loadsInFlight = useRef(new Set<string>());
  const requestedOffsets = useRef(new Map<string, number>());
  const rowIndexById = useMemo(() => new Map(rows.map((row, index) => [row.node.id, index])), [rows]);
  const activeLoadError = loadErrors.entries().next().value as [string, string] | undefined;
  const failedNode = activeLoadError ? rows.find(row => row.node.id === activeLoadError[0])?.node : undefined;

  useEffect(() => {
    requestedOffsets.current.clear();
    loadsInFlight.current.clear();
    setLoadingIds(new Set());
    setLoadErrors(new Map());
  }, [root.values]);

  const loadNode = useCallback(async (node: BusinessNode) => {
    if (!onLoadChildren || !node.hasChildren || node.childrenLoaded || loadsInFlight.current.has(node.id)) return;
    const loadedCount = childrenOf(node).length;
    if (requestedOffsets.current.get(node.id) === loadedCount) return;
    requestedOffsets.current.set(node.id, loadedCount);
    loadsInFlight.current.add(node.id);
    setLoadingIds(previous => new Set(previous).add(node.id));
    setLoadErrors(previous => {
      const next = new Map(previous);
      next.delete(node.id);
      return next;
    });
    try {
      await onLoadChildren(node);
    } catch (error) {
      requestedOffsets.current.delete(node.id);
      const message = error instanceof Error ? error.message : 'Unknown error.';
      setLoadErrors(previous => new Map(previous).set(node.id, message));
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
  }, [onLoadChildren, setExpanded]);

  useEffect(() => {
    for (const row of rows) {
      const { node } = row;
      if (!expanded.has(node.id) || !node.hasChildren || node.childrenLoaded || loadErrors.has(node.id)) continue;
      if (shouldPrefetch(row, rows, rowIndexById, endIndex)) void loadNode(node);
    }
  }, [endIndex, expanded, loadErrors, loadNode, rowIndexById, rows]);

  function clearLoadError(id: string) {
    setLoadErrors(previous => {
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  }

  return { loadingIds, loadErrors, activeLoadError, failedNode, loadNode, clearLoadError };
}
