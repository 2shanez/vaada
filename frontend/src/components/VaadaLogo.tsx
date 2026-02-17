'use client'

export function VaadaLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 640 640"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill="none" stroke="#2EE59D" strokeWidth="35" strokeLinecap="round">
        {/* Outer V */}
        <path d="M 115,141 L 320,499 L 525,141" strokeLinejoin="round" />
        {/* Middle V */}
        <path d="M 160,141 L 320,470 L 480,141" strokeLinejoin="round" />
        {/* Inner V */}
        <path d="M 205,141 L 320,441 L 435,141" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
