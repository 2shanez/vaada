'use client'

export function VaadaLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Triple-stroke V mark — no background */}
      <path d="M 76,60 L 230,400 Q 256,450 282,400 L 436,60"
        fill="none" stroke="#2EE59D" strokeWidth="32" strokeLinecap="round" />
      <path d="M 130,60 L 238,360 Q 256,400 274,360 L 382,60"
        fill="none" stroke="#2EE59D" strokeWidth="32" strokeLinecap="round" />
      <path d="M 184,60 L 246,320 Q 256,350 266,320 L 328,60"
        fill="none" stroke="#2EE59D" strokeWidth="32" strokeLinecap="round" />
    </svg>
  )
}
