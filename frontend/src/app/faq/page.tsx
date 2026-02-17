'use client'

import Link from 'next/link'

const faqs = [
  {
    q: 'What is Vaada?',
    a: 'Vaada is The Promise Market — a platform where you stake real money on your fitness goals. Hit your target, keep your stake. Miss it, and your stake goes to the treasury.',
  },
  {
    q: 'What is USDC?',
    a: 'USDC is a stablecoin pegged 1:1 to the US dollar. It\'s issued by Circle and runs on the blockchain. $1 USDC = $1 USD, always.',
  },
  {
    q: 'How do I get USDC?',
    a: 'You can buy USDC directly in the app using Apple Pay, Google Pay, or a debit card via Coinbase Onramp. You can also transfer USDC on Base from any wallet or exchange.',
  },
  {
    q: 'What blockchain does Vaada use?',
    a: 'Vaada runs on Base, a fast and low-cost Ethereum Layer 2 built by Coinbase. Transactions typically cost less than $0.01.',
  },
  {
    q: 'Do I need a crypto wallet?',
    a: 'Nope! When you sign in with email or Google, Vaada automatically creates an embedded wallet for you via Privy. No extensions or seed phrases needed.',
  },
  {
    q: 'How does verification work?',
    a: 'Connect your fitness tracker (Fitbit or Strava), and Vaada automatically verifies your activity data when the goal deadline hits. Only device-recorded activities count — no manual entries.',
  },
  {
    q: 'What happens if I win?',
    a: 'Your $5 stake is returned to your wallet. You kept your promise!',
  },
  {
    q: 'What happens if I lose?',
    a: 'Your $5 stake goes to the Vaada treasury. Think of it as the cost of breaking your promise.',
  },
  {
    q: 'Can I withdraw my USDC?',
    a: 'Yes — you can send USDC from your Vaada wallet to any address on Base at any time using the send button in the header.',
  },
  {
    q: 'Is my activity data private?',
    a: 'Yes. Vaada only reads the specific metrics needed for verification (steps, miles). We don\'t store or share your fitness data beyond what\'s needed to verify your goal.',
  },
  {
    q: 'What fitness trackers are supported?',
    a: 'Currently Fitbit (for step goals) and Strava (for running goals). More integrations are coming soon.',
  },
  {
    q: 'Is Vaada safe to use?',
    a: 'Vaada\'s smart contracts are deployed on Base mainnet. Stakes are held in audited contracts, not in anyone\'s personal wallet. That said, this is beta software — only stake what you\'re comfortable with.',
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors mb-8 inline-block">
          ← Back to Vaada
        </Link>
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-[var(--text-secondary)] mb-10">Everything you need to know about Vaada.</p>
        
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[var(--border)] pb-6">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
