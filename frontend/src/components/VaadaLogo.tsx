'use client'

/* eslint-disable @next/next/no-img-element */
export function VaadaLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/vaada-v.png"
      alt="Vaada"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block' }}
    />
  )
}
