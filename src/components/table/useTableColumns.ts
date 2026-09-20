import { useEffect, useRef, useState } from 'react';

function availableWidth() {
  if (typeof window === 'undefined') return 1408;
  return Math.min(1408, window.innerWidth - (window.innerWidth <= 600 ? 24 : 32));
}

function visiblePeriodCount(width: number, labelCount: number) {
  const labelWidth = typeof window !== 'undefined' && window.innerWidth <= 420 ? width - 92
    : typeof window !== 'undefined' && window.innerWidth <= 600 ? 250 : 280;
  return Math.max(1, Math.min(labelCount, Math.floor((width - labelWidth) / 92)));
}

export function useTableColumns(labels: string[]) {
  const panel = useRef<HTMLElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [periodCount, setPeriodCount] = useState(() => visiblePeriodCount(availableWidth(), labels.length));
  const groupStarts = Array.from({ length: Math.ceil(labels.length / periodCount) }, (_, index) =>
    Math.min(index * periodCount, labels.length - periodCount));
  const firstPeriod = groupStarts.filter(start => start <= selectedPeriod).at(-1) ?? 0;
  const visibleLabels = labels.slice(firstPeriod, firstPeriod + periodCount);

  useEffect(() => {
    const update = () => setPeriodCount(visiblePeriodCount(panel.current?.clientWidth || availableWidth(), labels.length));
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (panel.current) observer?.observe(panel.current);
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); };
  }, [labels.length]);

  return { panel, periodCount, groupStarts, firstPeriod, visibleLabels, setSelectedPeriod };
}
