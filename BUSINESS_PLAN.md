# Vaada Business Plan
*The Promise Market*

**Version:** 0.1 (Draft)  
**Last Updated:** February 2026

---

## Executive Summary

Vaada is a commitment market where users stake money on their promises. Keep your promise, keep your stake. Fail, and it goes to those who succeeded.

Think Polymarket, but for personal commitments instead of world events. "Bet on yourself."

**Current status:** Live on Base mainnet with Fitbit integration. Early users testing step challenges.

---

## Problem

**Accountability tools don't work because the stakes aren't real.**

- 92% of people fail their New Year's resolutions
- Existing apps (Beeminder, StickK) are niche, ugly, and don't grow
- No social/competitive element — it's just you losing money to a company
- No crypto-native solution exists

**The core insight:** People don't fear losing money to an app. They fear losing money to *other people* — especially people trying to beat them.

---

## Solution

**Vaada turns promises into markets.**

1. **Stake** — Put real money ($5-$100+) on your goal
2. **Compete** — Others join the same challenge with their stakes
3. **Verify** — Automatic verification via Fitbit, Strava, etc.
4. **Settle** — Winners split the losers' stakes

**Why it works:**
- Real money at risk (not points or badges)
- Social pressure (you're competing against real people)
- Upside potential (you can *win* money, not just not-lose it)
- Trustless payouts (smart contract, not company discretion)
- Money works while locked (stakes earn yield via Morpho vault)

---

## Why Now

1. **Polymarket proved it** — Prediction markets hit mainstream in 2024. People understand "stake money on outcomes."

2. **Crypto UX is finally good** — Base (cheap, fast), Privy (email login), USDC (stable). No more MetaMask + ETH gas nightmares.

3. **Wearables are everywhere** — 30%+ of US adults have a fitness tracker. Verification is automatic.

4. **Self-improvement is massive** — $15B+ market in the US alone. Apps, coaches, programs — but no one's added real stakes.

---

## Market Size

| Segment | Size | Vaada's angle |
|---------|------|---------------|
| Self-improvement apps | $15B | Accountability layer |
| Fitness apps/wearables | $30B | Goal staking integration |
| Online gambling/betting | $100B+ | "Bet on yourself" niche |
| Corporate wellness | $60B | B2B white-label |
| Health insurance incentives | $20B+ | Partner integrations |

**Initial wedge:** Fitness goals (steps, running, workouts)  
**Expansion:** Habits, learning, savings, sobriety, weight loss, professional goals

---

## Business Model

### Revenue Streams

1. **Yield on deposits via Morpho** (current, primary)
   - All staked USDC auto-deposited into Morpho vault (Gauntlet USDC Prime)
   - Earns ~4-5% APY while funds are locked during challenge
   - Users get their stake back; Vaada keeps the yield
   - Zero friction — happens automatically in the smart contract
   - Example: $10,000 TVL × 5% APY × 30-day avg hold = ~$41/month passive

2. **Platform fee** (future)
   - 2-5% of each pool at settlement
   - Not currently active — yield covers early costs
   - Can layer on once volume scales

3. **Premium features** (future)
   - Custom/private challenges
   - Corporate dashboards
   - Advanced analytics
   - White-label licensing

### Unit Economics

| Metric | Assumption |
|--------|------------|
| Avg stake | $10 |
| Avg pool size | $50 (5 players) |
| Avg challenge duration | 7 days |
| Morpho yield | ~5% APY |
| Yield per $50 pool (7 days) | $0.05 |
| Platform fee (future) | 3% |
| Combined revenue per pool | $1.55 |
| Pools per user/month | 2 |
| Revenue per user/month | $3.10 |
| CAC target | <$10 |
| LTV target | >$30 |

**Yield scales with TVL:**
| TVL | Annual Yield (5%) |
|-----|-------------------|
| $10K | $500 |
| $100K | $5,000 |
| $1M | $50,000 |
| $10M | $500,000 |

---

## Competitive Landscape

No YC-backed startup (across 5,000+ companies) builds what Vaada builds. Zero on-chain competitors exist.

### Direct Competitors (Money + Fitness/Habit Goals)

| Competitor | Model | Founded | Status | Weakness |
|------------|-------|---------|--------|----------|
| **StepBet** (WayBetter) | Pool betting on steps | ~2015 | Active | Web2, centralized, dated UX, no transparency |
| **DietBet** (WayBetter) | Pool betting on weight loss | ~2015 | Active | Weight-only, photo weigh-ins (gameable) |
| **Forfeit** | Habit contracts, forfeit to charity | ~2020 | Active, native app | Human referee verification (gameable), subscription model |
| **HealthyWage** | Weight loss cash prizes | 2009 | Active | Weight-only, video weigh-ins, old UX |
| **StickK** | Commitment contracts, $ to charity | 2008 | Active (stale) | Ancient UX, self-report, no API verification, Yale-founded but never scaled |
| **Beeminder** | Pledge $ if off track | ~2012 | Active (niche) | Quantified-self nerds only, bad UX, money goes to Beeminder |
| **Pact (GymPact)** | Paid for gym check-ins | ~2012 | **Dead** (shut down 2017) | Validates the model, couldn't scale |

### Crypto/Web3 Adjacent

| Competitor | Model | Status | Weakness |
|------------|-------|--------|----------|
| **Receipts.xyz** | Earn points for workouts, redeem perks | Active, funded | Rewards not stakes — no loss aversion |
| **STEPN** | Move-to-earn NFT sneakers | Collapsed from peak | GameFi ponzinomics, not commitment |
| **Sweatcoin** | Earn tokens for walking | Active, 100M+ downloads | Earn model, no stakes, token is nearly worthless |
| **Step.app** | Move-to-earn with NFTs | Fading | Same GameFi problems |
| **Genopets** | Move-to-earn RPG (Solana) | Niche | Gaming-focused, not accountability |

### Feature Competitors (Free Challenges, No Stakes)

| Platform | Threat Level | Note |
|----------|-------------|------|
| **Strava Challenges** | ⚠️ High if they add money | 120M users, but free challenges = no behavior change |
| **Nike Run Club** | ⚠️ Same | Massive distribution, but killed RTFKT / retreated from Web3 |
| **Fitbit Premium** | 🟡 Medium | Built into Google ecosystem |
| **Apple Fitness+** | 🟡 Medium | Activity ring sharing, no stakes |
| **Habitica** | 🟢 Low | Gamified habits RPG, no real money |

### YC-Backed Adjacent

| Company | Batch | What | Threat |
|---------|-------|------|--------|
| **Overlord** | W23 | AI Accountability Partner | 🟢 Low — AI coaching, no financial stakes |
| **Overfit** | S20 | Human coach + AI workouts | 🟢 Low — coaching model, not markets |

### Why Nobody Has Won This Market

1. **Web2 can't do trustless settlement** — StepBet decides who wins. Vaada's smart contracts decide automatically.
2. **Human verification is gameable** — Forfeit uses referees/photos. Vaada uses Fitbit/Strava APIs.
3. **Move-to-earn was backwards** — Printing tokens to reward activity is unsustainable. Vaada uses real money (USDC) and loss aversion.
4. **No one combined all the pieces** — On-chain stakes + API verification + yield + consumer UX. Each competitor has 1-2 of these. Vaada has all of them.

### Vaada's Moat

- **First and only crypto-native commitment market**
- **Trustless settlement** — Smart contracts decide, not the company
- **Automated verification** — Fitbit/Strava API, not human referees
- **Yield on locked stakes** — Morpho vault (~4.9% APY), competitors earn nothing on held funds
- **Built on Base** — Coinbase's 110M user ecosystem, penny gas, Apple Pay onramp
- **Composable** — Other apps can integrate Vaada's contracts as accountability infrastructure
- **Expandable** — Protocol works for any verifiable commitment, not just fitness

---

## Traction

*[Update with real numbers as you grow]*

| Metric | Current | Target (3mo) | Target (12mo) |
|--------|---------|--------------|---------------|
| Users | X | 100 | 1,000 |
| Total staked | $X | $5,000 | $100,000 |
| Pools settled | X | 50 | 500 |
| Retention (30d) | X% | 40% | 50% |

---

## Go-to-Market

### Phase 1: Friends & Fitness (Now)
- Seed with personal network
- Focus on step challenges (easy, universal)
- Iterate on UX based on feedback

### Phase 2: Crypto Twitter (Month 2-3)
- Content: "I staked $50 on 10K steps" threads
- Influencer partnerships (fitness + crypto crossover)
- Farcaster community activation

### Phase 3: Fitness Communities (Month 4-6)
- Reddit: r/fitness, r/running, r/loseit
- Strava clubs, Fitbit groups
- Running event partnerships

### Phase 4: Mainstream (Month 6-12)
- TikTok/Instagram fitness creators
- PR push: "The app that pays you to work out"
- App Store / Google Play (mobile app)

### Phase 5: B2B (Year 2)
- Corporate wellness programs
- Insurance partnerships
- White-label for gyms, health apps

---

## Product Roadmap

### Now (Q1 2026)
- [x] Core contracts deployed (Base mainnet)
- [x] Fitbit integration
- [ ] Strava integration
- [ ] Mobile-responsive polish
- [ ] 10 beta users

### Next (Q2 2026)
- [ ] Mobile app (iOS/Android)
- [ ] More goal types (weight, habits, learning)
- [ ] Social features (friends, leaderboards)
- [ ] Referral program

### Later (Q3-Q4 2026)
- [ ] API for third-party integrations
- [ ] Corporate/B2B dashboard
- [ ] Additional verification sources
- [ ] Multi-chain expansion

### Future (2027+)
- [ ] Insurance partnerships
- [ ] International expansion
- [ ] Governance token (maybe)
- [ ] Protocol grants for builders

---

## Team

**Shane Sarin** — Founder
- Web3/Product background
- Consensys (Product Growth), RECUR (Founding BA)
- UNC Chapel Hill, Economics
- Building Vaada solo + AI assistance

**Advisors:** *[Add as you get them]*

**Philosophy:** Stay lean, ship fast, hire only when necessary. Smart contracts + AI tooling = one person can run this.

---

## Financials

### Current
- Self-funded
- Minimal expenses (infra ~$50/mo)

### Projections

| Year | Users | GMV | Revenue (4%) | Expenses | Net |
|------|-------|-----|--------------|----------|-----|
| 2026 | 1,000 | $100K | $4K | $10K | -$6K |
| 2027 | 10,000 | $1M | $40K | $50K | -$10K |
| 2028 | 50,000 | $10M | $400K | $200K | $200K |

*GMV = Gross Market Volume (total staked)*

### Funding Needs

**Option A: Bootstrap**
- Keep costs low, grow organically
- Day job + Vaada until profitable
- Slower but keeps equity

**Option B: Raise seed ($500K-$1M)**
- Go full-time on Vaada
- Hire 1-2 people (eng, growth)
- Accelerate to product-market fit
- Target investors: crypto-native VCs, angels from Coinbase/Polymarket

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Regulatory (gambling classification) | Skill-based, user controls outcome. Legal review before scaling. |
| Verification gaming/cheating | Multiple data sources, dispute mechanism, anti-cheat filters |
| Low retention | Social features, streak rewards, new goal types |
| Competition | First mover + crypto-native moat. Move fast. |
| Smart contract bugs | Audits before major scale. Start with capped pools. |

---

## Vision

**Short-term:** The best way to actually hit your fitness goals.

**Medium-term:** The protocol for all personal commitments — fitness, habits, learning, finances, career.

**Long-term:** The infrastructure layer for accountability. Every app that wants "stake money on X" uses Vaada under the hood.

**The big picture:** Polymarket let people bet on the world. Vaada lets people bet on themselves. Both are markets for outcomes — one external, one personal.

---

## The Ask

*[Customize based on what you need]*

**If pitching investors:**
- Raising $X at $Y valuation
- Use of funds: full-time salary, eng hire, marketing

**If pitching partners:**
- Integration partnership (Fitbit, Strava official)
- Distribution partnership (fitness apps, corporate wellness)

**If pitching users:**
- Try it: vaada.io
- Join the first 100 users
- Stake on your next goal

---

## Contact

**Shane Sarin**  
- Email: shanesarin@gmail.com
- Twitter: [add]
- Telegram: @BlockShane2667
- Site: vaada.io

---

*"Keep your promise. Keep your stake."*
