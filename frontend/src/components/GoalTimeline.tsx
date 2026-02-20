'use client'

import type { Goal } from '@/lib/abis'

function formatTimeLeft(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now
  if (diff <= 0) return 'Passed'
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`
}

interface GoalTimelineProps {
  currentPhaseStep: number
  goalDetails: {
    entryDeadline?: number
    deadline?: number
  }
  durationText: string
  goal: Goal
}

export function GoalTimeline({ currentPhaseStep, goalDetails, durationText, goal }: GoalTimelineProps) {
  const steps = [
    { 
      label: 'Entry', 
      desc: goalDetails.entryDeadline 
        ? (formatTimeLeft(goalDetails.entryDeadline) === 'Passed' ? 'Closed' : `Closes in ${formatTimeLeft(goalDetails.entryDeadline)}`)
        : 'Join now'
    },
    { 
      label: 'Compete', 
      desc: (() => {
        if (!goalDetails.deadline) return `${durationText} window`;
        if (formatTimeLeft(goalDetails.deadline) === 'Passed') return 'Ended';
        if (currentPhaseStep === 0 && goalDetails.entryDeadline && goalDetails.deadline) {
          const competeDuration = goalDetails.deadline - goalDetails.entryDeadline;
          if (competeDuration < 3600) return `${Math.floor(competeDuration / 60)}m window`;
          if (competeDuration < 86400) return `${Math.floor(competeDuration / 3600)}h ${Math.floor((competeDuration % 3600) / 60)}m window`;
          return `${Math.floor(competeDuration / 86400)}d ${Math.floor((competeDuration % 86400) / 3600)}h window`;
        }
        return `${formatTimeLeft(goalDetails.deadline)} left`;
      })()
    },
    { 
      label: 'Verify', 
      desc: currentPhaseStep === 2 
        ? 'Verifying...' 
        : goal.targetUnit === 'steps'
          ? 'Via Fitbit'
          : goal.subdomain === 'Running' 
            ? 'Via Strava' 
            : 'Coming soon'
    },
    { 
      label: 'Payout', 
      desc: 'Winners split' 
    },
  ]

  return (
    <div className="py-5 border-t border-[var(--border)]/50">
      <div className="flex items-start">
        {steps.map((step, i) => (
          <div key={i} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center w-full mb-2">
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${i <= currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'}`} />
              )}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                i <= currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'
              }`} />
              {i < 3 && (
                <div className={`flex-1 h-0.5 ${i < currentPhaseStep ? 'bg-[#2EE59D]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
            <p className={`text-[10px] font-semibold text-center leading-tight ${i <= currentPhaseStep ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'}`}>
              {step.label}
            </p>
            <p className="text-[8px] text-[var(--text-secondary)] text-center leading-tight px-0.5">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
