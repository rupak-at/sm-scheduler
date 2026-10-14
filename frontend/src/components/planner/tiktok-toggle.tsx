import type { ReactNode } from 'react';

export function TikTokToggle({
  id,
  checked,
  change,
  disabled = false,
  children,
}: {
  id: string;
  checked: boolean;
  change: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md py-2 text-sm leading-relaxed ${disabled ? 'cursor-not-allowed text-muted' : ''}`}
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => change(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-ink focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
