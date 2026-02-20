'use client'

import type { Goal } from '@/lib/abis'

interface WinCelebrationProps {
  goal: Goal
  userStake: number
  goalDetails: { totalStaked?: number }
  onClose: () => void
}

export function WinCelebration({ goal, userStake, goalDetails, onClose }: WinCelebrationProps) {
  const shareUrl = `https://vaada.io`
  const shareText = `I kept my promise — ${goal.emoji} ${goal.title} with $${userStake} on the line ✅\n\nThink you can keep yours? →`

  return (
    <div className="bg-[var(--surface)] border border-[#2EE59D] rounded-2xl relative overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Falling confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${5 + Math.random() * 10}%`,
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              backgroundColor: ["#2EE59D", "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F59E0B"][i % 6],
              animation: `confettiFall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s infinite`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(46,229,157,0.2); }
          50% { box-shadow: 0 0 40px rgba(46,229,157,0.4); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="relative px-6 py-10 text-center" style={{ animation: "scaleIn 0.4s ease-out" }}>
        <div className="text-6xl mb-3">{goal.emoji}</div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2EE59D]/15 mb-4">
          <span className="text-xs font-bold text-[#2EE59D] uppercase tracking-wider">✓ Promise Kept</span>
        </div>

        <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{goal.title}</h3>

        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2EE59D]/10 border border-[#2EE59D]/20 mb-6" style={{ animation: "pulseGlow 2s ease-in-out infinite" }}>
          <span className="text-3xl font-bold text-[#2EE59D]">+${userStake}</span>
          <span className="text-sm font-medium text-[#2EE59D]/70">USDC</span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs mx-auto">
          {goal.participants && goal.participants > 1 && userStake > 0 && goalDetails.totalStaked && goalDetails.totalStaked > userStake
            ? "Promise kept. You earned from the ones who didn't."
            : 'Everyone kept their promise. Your stake is back where it belongs.'
          }
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank")
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share Win
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "I kept my promise on Vaada!", text: shareText, url: shareUrl }).catch(() => {})
              } else {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:border-[var(--foreground)] active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-secondary)]/50 mt-6 uppercase tracking-widest">vaada.io</p>
      </div>
    </div>
  )
}
