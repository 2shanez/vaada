import type { Metadata } from 'next'

// Goal data for metadata
const GOALS: Record<string, { emoji: string; title: string; description: string; minStake: number; maxStake: number }> = {
  '10': { emoji: '🌅', title: 'Daily Mile', description: 'Run 1 mile today', minStake: 5, maxStake: 50 },
  '1': { emoji: '🌅', title: 'Daily Mile', description: 'Run 1 mile today', minStake: 5, maxStake: 50 },
  '2': { emoji: '☀️', title: 'Daily 3', description: 'Run 3 miles today', minStake: 5, maxStake: 50 },
  '3': { emoji: '💪', title: 'Weekend Warrior', description: 'Run 10 miles this weekend', minStake: 10, maxStake: 100 },
  '4': { emoji: '⚡', title: 'Weekly 15', description: 'Run 15 miles this week', minStake: 10, maxStake: 100 },
  '5': { emoji: '🏃', title: 'February 50', description: 'Run 50 miles this month', minStake: 20, maxStake: 200 },
  '6': { emoji: '🏅', title: 'Marathon Prep', description: 'Hit 100 miles in 30 days', minStake: 20, maxStake: 200 },
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const goal = GOALS[id] || GOALS['1']
  
  return {
    title: `${goal.emoji} ${goal.title} | vaada`,
    description: `${goal.description}. Stake $${goal.minStake}-$${goal.maxStake} on your promise.`,
    openGraph: {
      title: `${goal.emoji} ${goal.title}`,
      description: `${goal.description}. Stake $${goal.minStake}-$${goal.maxStake} on your promise.`,
      url: `https://vaada.io/goal/${id}`,
      siteName: 'vaada',
      type: 'website',
      images: [{
        url: `https://vaada.io/api/og/${id}`,
        width: 1200,
        height: 630,
        alt: goal.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${goal.emoji} ${goal.title}`,
      description: `${goal.description}. Stake $${goal.minStake}-$${goal.maxStake} on your promise.`,
      images: [`https://vaada.io/api/og/${id}`],
    },
  }
}

export default async function GoalPage() {
  // Don't redirect server-side - let client handle it so crawlers can read meta tags
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.href = '/';`,
      }}
    />
  )
}
