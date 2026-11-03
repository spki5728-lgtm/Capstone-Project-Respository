// Flipcast mark: a rising line on the brand gradient. Same drawing as public/favicon.svg.
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="flipcast-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e11d48" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#flipcast-logo)" />
      <path d="M7 21.5l6-6 4 4 8-8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 11.5H25V17" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
