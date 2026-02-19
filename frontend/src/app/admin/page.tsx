'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [goalType, setGoalType] = useState(1) // 0=Strava Miles, 1=Fitbit Steps
  const [target, setTarget] = useState('')
  const [stake, setStake] = useState('')
  const [maxStake, setMaxStake] = useState('')
  const [entryMinutes, setEntryMinutes] = useState('60')
  const [deadlineMinutes, setDeadlineMinutes] = useState('120')

  const handleAuth = () => {
    if (password === 'ripplepigdetect098') {
      setAuthed(true)
    } else {
      setError('Wrong password')
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    const now = Math.floor(Date.now() / 1000)
    const entryDeadline = now + Number(entryMinutes) * 60
    const deadline = now + Number(deadlineMinutes) * 60
    const minStakeUsdc = Number(stake) * 1e6
    const maxStakeUsdc = (maxStake ? Number(maxStake) : Number(stake)) * 1e6

    try {
      const res = await fetch('/api/admin/create-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          goalType,
          target: Number(target),
          minStake: minStakeUsdc,
          maxStake: maxStakeUsdc,
          startTime: now,
          entryDeadline,
          deadline,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-full max-w-sm p-6">
          <h1 className="text-xl font-bold mb-4 text-center">Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D] mb-3"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleAuth}
            className="w-full py-3 bg-[#2EE59D] text-white font-semibold rounded-xl hover:bg-[#26c987] transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Create Promise</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 10K Steps Daily"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGoalType(1)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  goalType === 1
                    ? 'border-[#2EE59D] bg-[#2EE59D]/10 text-[#2EE59D]'
                    : 'border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                👟 Fitbit Steps
              </button>
              <button
                onClick={() => setGoalType(0)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  goalType === 0
                    ? 'border-[#2EE59D] bg-[#2EE59D]/10 text-[#2EE59D]'
                    : 'border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                🏃 Strava Miles
              </button>
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Target ({goalType === 1 ? 'steps' : 'miles'})
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={goalType === 1 ? 'e.g. 10000' : 'e.g. 3'}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
            />
          </div>

          {/* Stake */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Min Stake ($)</label>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="5"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Max Stake ($)</label>
              <input
                type="number"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value)}
                placeholder="Same as min"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>
          </div>

          {/* Timing */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Entry window (min)</label>
              <input
                type="number"
                value={entryMinutes}
                onChange={(e) => setEntryMinutes(e.target.value)}
                placeholder="60"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Total duration (min)</label>
              <input
                type="number"
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(e.target.value)}
                placeholder="120"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:border-[#2EE59D]"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm space-y-1">
            <p className="font-medium">Preview</p>
            <p className="text-[var(--text-secondary)]">
              {name || '(unnamed)'} · {target || '?'} {goalType === 1 ? 'steps' : 'miles'} · ${stake || '?'}{maxStake && maxStake !== stake ? `-$${maxStake}` : ''} stake
            </p>
            <p className="text-[var(--text-secondary)]">
              Entry: {entryMinutes}min · Deadline: {deadlineMinutes}min from now
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={loading || !name || !target || !stake}
            className="w-full py-3 bg-[#2EE59D] text-white font-bold rounded-xl hover:bg-[#26c987] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Promise'}
          </button>

          {/* Result */}
          {result && (
            <div className="p-4 rounded-xl bg-[#2EE59D]/10 border border-[#2EE59D]/30 text-sm">
              <p className="font-semibold text-[#2EE59D] mb-1">✅ Created!</p>
              <p className="text-[var(--text-secondary)] break-all">TX: {result.txHash}</p>
              <p className="text-[var(--text-secondary)]">Block: {result.blockNumber}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">Goal will appear in Browse Promises automatically.</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
