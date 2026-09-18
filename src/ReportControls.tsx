import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from '@daypicker/react';
import { firstSelectableDay, lastSelectableDay, type ReportDetail, type ReportRange } from './reportPeriod';

interface Props {
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  detail: ReportDetail;
  onDetailChange: (detail: ReportDetail) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ReportControls({ range, onRangeChange, detail, onDetailChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(range);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const control = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!control.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return <div className="flex flex-wrap items-center justify-end gap-2 text-sm max-[601px]:w-full">
    <div className="relative" ref={control}>
      <button ref={trigger} type="button" className="min-h-10 cursor-pointer rounded border border-ink/20 bg-white px-3 text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setDraft(range); setPendingStart(null); setOpen(value => !value); }}>
        <span className="text-ink/60">Period: </span>{dateFormatter.format(range.from)} – {dateFormatter.format(range.to)}
      </button>
      {open && <div role="dialog" aria-label="Choose report period" className="report-calendar absolute right-0 z-30 mt-2 rounded-lg border border-ink/10 bg-white p-3 shadow-lg">
        {pendingStart && <p className="mb-2 text-xs text-ink/70" aria-live="polite">Start: {dateFormatter.format(pendingStart)}. Choose an end date.</p>}
        <DayPicker mode="range" selected={draft} onDayClick={(date, modifiers) => {
          if (modifiers.disabled) return;
          if (!pendingStart) {
            setPendingStart(date);
            setDraft({ from: date, to: undefined });
            return;
          }
          const selection = { from: date < pendingStart ? date : pendingStart, to: date < pendingStart ? pendingStart : date };
          onRangeChange(selection);
          setOpen(false);
          setPendingStart(null);
          trigger.current?.focus();
        }} captionLayout="dropdown" defaultMonth={range.from}
          startMonth={firstSelectableDay} endMonth={lastSelectableDay}
          disabled={{ before: firstSelectableDay, after: lastSelectableDay }} />
      </div>}
    </div>
    <label className="sr-only" htmlFor="report-detail">Detail</label>
    <div className="relative">
      <select id="report-detail" className="min-h-10 cursor-pointer appearance-none rounded border border-ink/20 bg-white pl-3 pr-10 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" value={detail} onChange={event => onDetailChange(event.target.value as ReportDetail)}>
        <option value="year">By year</option>
        <option value="month">By month</option>
        <option value="day">By day</option>
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="m2 4 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </div>;
}
