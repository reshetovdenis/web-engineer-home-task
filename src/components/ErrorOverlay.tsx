import { useId } from 'react';

interface Props {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function ErrorOverlay({ title, message, onRetry, retryLabel = 'Try again' }: Props) {
  const titleId = useId();
  const messageId = useId();

  return <div
    className="fixed inset-0 z-[100] grid place-items-center bg-black/25 px-4 py-6 backdrop-blur-[2px]"
    role="alert"
    aria-live="assertive"
    aria-labelledby={titleId}
    aria-describedby={messageId}
  >
    <div className="w-full max-w-[480px] rounded-2xl border border-[#ead6d6] bg-white p-6 text-center shadow-[0_24px_80px_rgba(20,20,19,0.22)] max-[480px]:p-5">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#fff1f1] text-[#b42318]" aria-hidden="true">
        <span className="text-2xl/none font-semibold">!</span>
      </div>
      <h2 id={titleId} className="text-xl/7 font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <p id={messageId} className="mx-auto mt-2 max-w-[390px] break-words text-sm/6 text-ink/65">{message}</p>
      <button
        className="mt-6 min-h-11 cursor-pointer rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6] max-[480px]:w-full"
        type="button"
        onClick={onRetry}
        autoFocus
      >
        {retryLabel}
      </button>
    </div>
  </div>;
}
