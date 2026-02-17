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
      {/* Triple-stroke V: 3 nested hairpin curves */}
      <path d="M 116,110 L 240,380 Q 256,412 272,380 L 396,110"
        fill="none" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <path d="M 160,110 L 246,348 Q 256,372 266,348 L 352,110"
        fill="none" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <path d="M 204,110 L 251,316 Q 256,332 261,316 L 308,110"
        fill="none" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
    </svg>
  )
}
