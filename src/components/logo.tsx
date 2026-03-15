"use client";

interface LogoProps {
  className?: string;
  size?: number;
}

/** Blockchain-inspired logo: interconnected blocks representing distributed ledger. */
export function Logo({ className = "", size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Chain of three blocks — blockchain / distributed ledger */}
      <rect x="3" y="11" width="7" height="7" rx="1.5" fill="url(#logo-grad)" opacity="0.85" />
      <rect x="10.5" y="7" width="7" height="7" rx="1.5" fill="url(#logo-grad)" />
      <rect x="18" y="11" width="7" height="7" rx="1.5" fill="url(#logo-grad)" opacity="0.85" />
    </svg>
  );
}
