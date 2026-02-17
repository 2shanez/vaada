'use client'

import Link from 'next/link'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors mb-8 inline-block">
          ← Back to Vaada
        </Link>
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-[var(--text-secondary)] mb-10">We&apos;re here to help.</p>
        
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="font-semibold mb-2">📧 Email Support</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              For general questions, issues, or feedback.
            </p>
            <a href="mailto:hello@vaada.io" className="text-[#2EE59D] text-sm font-medium hover:underline">
              hello@vaada.io
            </a>
          </div>
          
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="font-semibold mb-2">🐛 Bug Reports</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Found something broken? Email us with details about what happened, what you expected, and any screenshots. We&apos;ll fix it fast.
            </p>
          </div>
          
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="font-semibold mb-2">💡 Feature Requests</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Have an idea for a new goal type, integration, or feature? We&apos;d love to hear it. Drop us a line at{' '}
              <a href="mailto:hello@vaada.io" className="text-[#2EE59D] hover:underline">hello@vaada.io</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
