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
      {/* Triple-stroke V - tight parallel lines converging */}
      <line x1="100" y1="130" x2="248" y2="400" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <line x1="412" y1="130" x2="264" y2="400" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <line x1="145" y1="130" x2="252" y2="375" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <line x1="367" y1="130" x2="260" y2="375" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <line x1="190" y1="130" x2="253" y2="350" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
      <line x1="322" y1="130" x2="259" y2="350" stroke="#2EE59D" strokeWidth="28" strokeLinecap="round" />
    </svg>
  )
}
