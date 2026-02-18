# Vaada: The Promise Market

**Version 2.0 — February 2026**

---

## Abstract

Vaada is a commitment market where users stake money on personal promises. Keep your promise, keep your stake. Break it, and your money goes to those who succeeded.

Think Polymarket, but for personal commitments instead of world events. "Bet on yourself."

*"Vaada" means "promise" in Hindi.*

**Status: Live on Base Mainnet** 🚀

---

## The Problem

**$72 billion** is spent annually on fitness and self-improvement. Yet:

- 92% of people fail their New Year's resolutions
- 50% of gym memberships go unused
- Fitness apps have <5% long-term retention

The missing ingredient isn't information or access — it's **commitment with real stakes**.

Behavioral economics shows loss aversion is 2x stronger than gain motivation. People work harder to avoid losing $100 than to gain $100. Existing accountability tools don't work because:

- Existing apps (Beeminder, StickK) are niche, ugly, and don't grow
- No social/competitive element — it's just you losing money to a company
- No crypto-native solution exists

**The core insight:** People don't fear losing money to an app. They fear losing money to *other people* — especially people trying to beat them.

---

## The Solution

**Vaada turns promises into markets.**

1. **Stake** — Put real money on your goal (e.g., "$5 on 10K steps today")
2. **Compete** — Others join the same challenge with their stakes
3. **Verify** — Automatic verification via Fitbit, Strava, etc.
4. **Settle** — Hit your goal = stake returned + bonus from losers. Miss = stake goes to winners.

No middleman. No refunds. No excuses.

**Why it works:**
- Real money at risk (not points or badges)
- Social pressure (you're competing against real people)
- Upside potential (you can *win* money, not just not-lose it)
- Trustless payouts (smart contract, not company discretion)
- Money works while locked (stakes earn yield via Morpho vault)

---

## The Innovation

**Programmable consequences for real-world behavior.**

Before now, you could:
- Bet on sports (someone else's behavior)
- Bet on prices (market behavior)
- "Commit" to personal goals (honor system, no enforcement)

With Vaada, you program automatic, trustless consequences for *your own* verified actions. The oracle fetches your data, the contract evaluates the outcome, the money moves. No disputes. No referees.

This pattern — verifiable real-world outcomes triggering on-chain settlement — unlocks consequences for any behavior with a data source:

| Domain | Data Source | Example |
|--------|-------------|---------|
| Fitness | Fitbit, Strava, Apple Health | Steps, miles, workouts |
| Learning | Coursera, Duolingo | Course completion |
| Productivity | GitHub, Linear | Shipping code |
| Health | Oura, Whoop | Sleep, recovery |
| Finance | Plaid | Savings goals |

Vaada is the first product built on this primitive. It won't be the last.

---

## Why Now

1. **Polymarket proved it** — Prediction markets hit mainstream in 2024. People understand "stake money on outcomes."
2. **Crypto UX is finally good** — Base (cheap, fast), Privy (email login), USDC (stable). No more MetaMask + ETH gas nightmares.
3. **Wearables are everywhere** — 30%+ of US adults have a fitness tracker. Verification is automatic.
4. **Self-improvement is massive** — $15B+ market in the US alone. Apps, coaches, programs — but no one's added real stakes.

---

## How It Works

### Smart Contract Architecture

```
User Stakes USDC
       ↓
   VaadaV3.sol (holds funds, tracks goals)
       ↓
   USDC deposited to Morpho Vault (earns ~4.9% APY)
       ↓
   Deadline Reached
       ↓
   Backend Verifier (fetches Fitbit/Strava API)
       ↓
   verifyParticipant(goalId, participant, actualValue)
       ↓
   Morpho withdrawal + Settlement (winners paid, losers slashed)
```

### Goal Types

| GoalType | Data Source | Metric |
|----------|-------------|--------|
| STRAVA_MILES | Strava API | Miles run/cycled |
| FITBIT_STEPS | Fitbit API | Daily step count |

### Economic Model

**For Users:**
- **Winners**: Receive stake back + proportional share of loser pool (based on stake size)
- **Losers**: Stake distributed to winners weighted by their stakes
- **Fee**: 0% — platform never touches user stakes

**Payout formula:**
```
Your Bonus = (Your Stake / Total Winner Stakes) × Loser Pool
```

---

## Business Model

### Revenue Streams

1. **Yield on deposits via Morpho** (current, primary)
   - All staked USDC auto-deposited into Morpho vault (Gauntlet USDC Prime)
   - Earns ~4-5% APY while funds are locked
   - Users get their stake back; Vaada keeps the yield
   - Zero friction — happens automatically in the smart contract

2. **Platform fee** (future)
   - 2-5% of each pool at settlement
   - Not currently active — yield covers early costs

3. **Premium features** (future)
   - Custom/private challenges
   - Corporate dashboards
   - White-label licensing

### Yield Scales with TVL

| TVL | Annual Yield (5%) |
|-----|-------------------|
| $10K | $500 |
| $100K | $5,000 |
| $1M | $50,000 |
| $10M | $500,000 |

### Unit Economics

| Metric | Assumption |
|--------|------------|
| Avg stake | $10 |
| Avg pool size | $50 (5 players) |
| Avg challenge duration | 7 days |
| Revenue per user/month | ~$3 |
| CAC target | <$10 |
| LTV target | >$30 |

---

## Market Opportunity

### The Promise Market

Commitment isn't a feature — it's a **market**.

Every coach, gym buddy, AA sponsor, and accountability partner proves demand exists. People pay for someone to hold them to their word. Vaada makes that programmable.

**Adjacent markets we pull from:**
- Fitness/wellness: **$96B**
- Prediction markets: **$65B**
- Habit/productivity apps: **$12B**
- Corporate wellness: **$56B**
- Personal coaching: **$15B**

---

## Competitive Landscape

No YC-backed startup (across 5,000+ companies) builds what Vaada builds. Zero on-chain competitors exist.

### Direct Competitors

| Competitor | Model | Weakness |
|------------|-------|----------|
| **StepBet/DietBet** (WayBetter) | Pool betting on steps/weight | Web2, centralized, dated UX |
| **Forfeit** | Habit contracts, forfeit to charity | Human referee verification (gameable), subscription model |
| **HealthyWage** | Weight loss cash prizes | Weight-only, video weigh-ins |
| **StickK** | Commitment contracts, $ to charity | Ancient UX, self-report, never scaled |
| **Beeminder** | Pledge $ if off track | Quantified-self nerds only, money goes to Beeminder |

### Crypto Adjacent

| Competitor | Model | Weakness |
|------------|-------|----------|
| **Receipts.xyz** | Points for workouts | Rewards not stakes — no loss aversion |
| **STEPN/Sweatcoin** | Move-to-earn | GameFi ponzinomics, not commitment |

### Feature Competitors

| Platform | Note |
|----------|------|
| **Strava Challenges** | 120M users, but free = no behavior change |
| **Nike/Apple/Fitbit** | Massive distribution, no financial stakes |

### Why Nobody Has Won

1. **Web2 can't do trustless settlement** — StepBet decides who wins. Vaada's smart contracts decide automatically.
2. **Human verification is gameable** — Forfeit uses referees/photos. Vaada uses Fitbit/Strava APIs.
3. **Move-to-earn was backwards** — Printing tokens to reward activity is unsustainable. Vaada uses real money and loss aversion.
4. **No one combined all the pieces** — On-chain stakes + API verification + yield + consumer UX.
5. **Agentic future** — Voice-enabled AI agents will stake on behalf of users. On-chain contracts are agent-compatible; Web2 dashboards behind logins are not.

### Vaada's Moat

- First and only crypto-native commitment market
- Trustless settlement via smart contracts
- Automated API verification (not human referees)
- Yield on locked stakes via Morpho (~4.9% APY)
- Built on Base — Coinbase's 110M user ecosystem, penny gas, Apple Pay onramp
- Composable — other apps can integrate Vaada as accountability infrastructure
- Expandable — works for any verifiable commitment, not just fitness

---

## Go-to-Market

### Phase 1: Friends & Fitness (Now)
- Seed with personal network, step challenges
- Iterate on UX based on feedback

### Phase 2: Crypto Twitter (Month 2-3)
- "I staked $50 on 10K steps" threads
- Farcaster community activation

### Phase 3: Fitness Communities (Month 4-6)
- Reddit (r/fitness, r/running), Strava clubs, Fitbit groups
- Running event partnerships

### Phase 4: Mainstream (Month 6-12)
- TikTok/Instagram fitness creators
- Mobile app (iOS/Android)
- "The app that pays you to work out"

### Phase 5: B2B (Year 2)
- Corporate wellness programs
- Insurance partnerships
- White-label for gyms, health apps

---

## Product Roadmap

### Done (Q1 2026)
- [x] Core contracts deployed (Base mainnet)
- [x] Fitbit + Strava integration
- [x] Privy wallet integration (email/Google login)
- [x] NewUserChallenge onboarding contract
- [x] Morpho vault yield integration
- [x] Gas sponsorship (gasless for embedded wallets)
- [x] Coinbase Onramp (Apple Pay, debit card)
- [x] Profile names & leaderboards
- [x] Automated cron verification + settlement

### Next (Q2 2026)
- [ ] Mobile app (iOS/Android)
- [ ] More goal types (weight, habits, learning)
- [ ] Social features (friends, groups, leagues)
- [ ] 100 users

### Later (Q3-Q4 2026)
- [ ] API for third-party integrations
- [ ] Corporate/B2B dashboard
- [ ] Additional verification sources (Apple Health, Garmin, Whoop)

### Future (2027+)
- [ ] Agentic AI accountability (voice-enabled staking)
- [ ] Insurance partnerships
- [ ] Protocol SDK for builders

---

## Traction

| Metric | Current | Target (3mo) | Target (12mo) |
|--------|---------|--------------|---------------|
| Users | Early beta | 100 | 1,000 |
| Total staked | — | $5,000 | $100,000 |
| Pools settled | — | 50 | 500 |

---

## Financials

### Current
- Self-funded, minimal expenses (~$50/mo infra)

### Projections

| Year | Users | GMV | Revenue | Expenses | Net |
|------|-------|-----|---------|----------|-----|
| 2026 | 1,000 | $100K | $4K | $10K | -$6K |
| 2027 | 10,000 | $1M | $40K | $50K | -$10K |
| 2028 | 50,000 | $10M | $400K | $200K | $200K |

### Funding

**Option A: Bootstrap** — Day job + Vaada until profitable. Slower but keeps equity.

**Option B: Raise seed ($500K-$1M)** — Go full-time, hire 1-2 people, accelerate to PMF. Target: crypto-native VCs, angels from Coinbase/Polymarket ecosystem.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Regulatory (gambling) | Skill-based, user controls outcome. Legal review before scaling. |
| Cheating | Anti-cheat filters (manual activities blocked), multi-source verification planned |
| Low retention | Social features, streak rewards, new goal types |
| Smart contract bugs | Audits before major scale. Capped pools. |

---

## Technical Details

### Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| VaadaV3 | `0xAc67E863221B703CEE9B440a7beFe71EA8725434` |
| GoalStakeAutomationV3 | `0xA6BcEcA41fCF743324a864F47dd03F0D3806341D` |
| NewUserChallenge V3 | `0xdC9ee5e9E99e3568D2B5eA9409222fbFeCB56373` |
| Morpho Vault | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

### Stack

- **Chain**: Base (Coinbase L2) — Mainnet
- **Yield**: Morpho Vault (Gauntlet USDC Prime, ~4.9% APY)
- **Frontend**: Next.js 16, Privy (embedded wallets), wagmi
- **Verification**: Backend verifier → Fitbit/Strava APIs
- **Auth**: Privy (email/Google login, embedded wallets, gas sponsorship)
- **Onramp**: Coinbase (Apple Pay, Google Pay, debit card)
- **Token Storage**: Supabase (encrypted refresh tokens)

### Security

- Stakes held in audited ERC20 (USDC)
- Yield via Morpho vault (audited)
- Anti-cheat: only device-recorded activities count (`manual: false` filter)
- Gas sponsorship: Privy-managed, ~$0.001/tx on Base
- Contracts are unaudited MVP — audit planned before major scale

---

## Team

**Shane Sarin** — Solo Founder
- UNC Chapel Hill, Economics
- Product @ Consensys (2023-2025)
- Analyst @ RECUR (2021-2022)

Building solo + AI assistance. Smart contracts + AI tooling = one person can build what used to take a team.

---

## Vision

**Short-term:** The best way to actually hit your fitness goals.

**Medium-term:** The protocol for all personal commitments — fitness, habits, learning, finances, career.

**Long-term:** The infrastructure layer for accountability. Every app that wants "stake money on X" uses Vaada under the hood.

Polymarket let people bet on the world. Vaada lets people bet on themselves.

---

## Links

- **Website**: https://vaada.io
- **GitHub**: https://github.com/2shanez/vaada
- **BaseScan**: https://basescan.org/address/0xAc67E863221B703CEE9B440a7beFe71EA8725434
- **Contact**: hello@vaada.io

---

*"Keep your promise. Keep your stake."*
