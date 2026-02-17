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
        {/* Outer V - smooth hairpin at bottom */}
        <path d="M 115,141 L 295,480 Q 320,530 345,480 L 525,141" />
        {/* Middle V */}
        <path d="M 160,141 L 300,455 Q 320,495 340,455 L 480,141" />
        {/* Inner V */}
        <path d="M 205,141 L 305,430 Q 320,460 335,430 L 435,141" />
      </g>
    </svg>
  )
}
