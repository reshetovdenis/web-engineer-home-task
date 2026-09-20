import { useState } from 'react';

export function EmployeeAvatar({ id, name }: { id: string; name: string; }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const parts = name.trim().split(/\s+/);
    const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toLocaleUpperCase();
    return <span className="employee-avatar-fallback grid size-5 flex-none place-items-center rounded-full bg-[#e6defd] text-[10px]/none font-semibold text-[#5c438b]" aria-hidden="true">{initials}</span>;
  }
  return <img className="employee-avatar block size-5 flex-none rounded-full object-cover" src={`/api/avatars/${id}.jpg`} alt="" width="20" height="20"
    loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
