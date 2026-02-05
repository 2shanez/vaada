'use client'

import { useState, useEffect } from 'react'

const SITE_PASSWORD = 'vaada2026' // Change this to whatever you want

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if already authorized
    const saved = localStorage.getItem('vaada_auth')
    if (saved === 'true') {
      setAuthorized(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === SITE_PASSWORD) {
      localStorage.setItem('vaada_auth', 'true')
      setAuthorized(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  if (authorized) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#2EE59D] mb-2">vaada</h1>
          <p className="text-[var(--text-secondary)] text-sm">Private beta access</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-3 rounded-lg bg-[var(--surface)] border ${
                error ? 'border-red-500' : 'border-[var(--border)]'
              } focus:outline-none focus:border-[#2EE59D] transition-colors`}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">Incorrect password</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-[#2EE59D] text-white font-semibold rounded-lg hover:bg-[#26c987] transition-colors"
          >
            Enter
          </button>
        </form>
        
        <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
          Request access from the team
        </p>
      </div>
    </div>
  )
}
