export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M19.6 9H13a4 4 0 0 0 0 8h6a3.5 3.5 0 0 1 0 7H8.5"
        stroke="currentColor"
        strokeWidth="2.45"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="9" r="1.35" fill="currentColor" />
    </svg>
  );
}
