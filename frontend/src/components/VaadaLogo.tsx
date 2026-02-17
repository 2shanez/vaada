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
      <rect width="512" height="512" rx="64" fill="#111111" />
      {/* Triple-stroke V */}
      <line x1="96" y1="120" x2="256" y2="400" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
      <line x1="416" y1="120" x2="256" y2="400" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
      <line x1="146" y1="120" x2="256" y2="370" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
      <line x1="366" y1="120" x2="256" y2="370" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
      <line x1="196" y1="120" x2="256" y2="340" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
      <line x1="316" y1="120" x2="256" y2="340" stroke="#2EE59D" strokeWidth="30" strokeLinecap="round" />
    </svg>
  )
}
