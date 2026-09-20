export function Spinner() {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent" role="status" aria-label="Loading">
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" aria-hidden="true" />
      <span className="text-sm text-ink/70">Loading...</span>
    </div>
  </div>;
}
