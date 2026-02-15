# Vaada: The Promise Market

**Version 1.1 — February 2026**

---

## Abstract

Vaada is a decentralized commitment protocol that allows users to stake money on personal goals. Users commit USDC to fitness challenges verified by Fitbit or Strava data through Chainlink oracles. Hit your goal, keep your stake plus earn from those who didn't. Miss it, your stake goes to the winners.

This is the "put your money where your mouth is" protocol.

*"Vaada" means "promise" in Hindi.*

**Status: Live on Base Mainnet** 🚀

---

## The Problem

**$72 billion** is spent annually on fitness and self-improvement. Yet:

- 92% of people fail their New Year's resolutions
- 50% of gym memberships go unused
- Fitness apps have <5% long-term retention

The missing ingredient isn't information or access — it's **commitment with real stakes**.

Behavioral economics shows loss aversion is 2x stronger than gain motivation. People work harder to avoid losing $100 than to gain $100. Vaada weaponizes this.

---

## The Solution

Vaada creates **financial commitment** for personal goals:

1. **Stake** — Commit $20 USDC to a fitness goal (e.g., "10K steps today")
2. **Perform** — Complete your activity tracked by Fitbit or Strava
3. **Verify** — Chainlink Functions automatically fetch your fitness data
4. **Settle** — Hit your goal = stake returned + bonus from losers. Miss = stake distributed to winners.

No middleman. No refunds. No excuses.

---

## The Innovation

**Programmable consequences for real-world behavior.**

That's the primitive Vaada introduces.

Before now, you could:
- Bet on sports (someone else's behavior)
- Bet on prices (market behavior)
- "Commit" to personal goals (honor system, no enforcement)

With Vaada:
- You program automatic, trustless consequences for *your own* verified actions

**The machine decides.** No disputes. No "I forgot to log it." No referee. The oracle fetches your data, the contract evaluates the outcome, the money moves. This pattern — verifiable real-world outcomes triggering on-chain settlement — is new.

The innovation isn't "fitness app with crypto." It's **verifiable real-world outcomes as a smart contract primitive.**

This unlocks consequences for any behavior with a data source:

| Domain | Data Source | Consequence |
|--------|-------------|-------------|
| Fitness | Fitbit, Strava, Apple Health | Stake on steps, miles, workouts |
| Learning | Coursera, Duolingo | Stake on course completion |
| Productivity | GitHub, Linear | Stake on shipping code |
| Health | Oura, Whoop | Stake on sleep, recovery |
| Sobriety | Wearables, biomarkers | Stake on streaks |

Vaada is the first product built on this primitive. It won't be the last.

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
   Chainlink Automation (triggers verification)
       ↓
   Chainlink Functions (fetches Fitbit/Strava API)
       ↓
   verifyParticipant(goalId, participant, actualValue)
       ↓
   Morpho withdrawal + Settlement (winners paid, losers slashed)
```

### Goal Types

The contract supports multiple verification sources via the `GoalType` enum:

| GoalType | Data Source | Metric |
|----------|-------------|--------|
| STRAVA_MILES | Strava API | Miles run/cycled |
| FITBIT_STEPS | Fitbit API | Daily step count |

Each goal type has its own verification logic in the Chainlink Functions source code.

### Economic Model

**For Users:**
- **Winners**: Receive stake back + proportional share of loser pool (based on stake size)
- **Losers**: Stake distributed to winners weighted by their stakes
- **Fee**: 0% — platform never touches user stakes

**Stake-Weighted Payouts:**
Winners receive bonus proportional to their stake. If you stake more, you earn more from the loser pool.

```
Your Bonus = (Your Stake / Total Winner Stakes) × Loser Pool
```

Example: If you stake $20 and total winner stakes are $100, you get 20% of the loser pool.

**Current Product (MVP):**
| Challenge | Stake | Duration | Target |
|-----------|-------|----------|--------|
| Daily 10K Steps | $20 | 24 hours | 10,000 steps |

**Platform Revenue:**
- All staked USDC is deposited into Morpho vault (~4.9% APY)
- Platform earns yield on TVL while funds are locked
- Users get their full stakes back; platform keeps the yield
- `claimYield()` function allows owner to withdraw accumulated yield

This creates:
- **Zero-fee UX** — users keep 100% of winnings
- **Sustainable revenue** — scales with TVL and challenge duration
- **Aligned incentives** — platform benefits from more stakes locked longer

---

## Why Crypto?

| Traditional Apps | Vaada |
|------------------|-------|
| "Challenges" with no stakes | Real money on the line |
| Trust the company | Trust the code |
| Refunds available | No refunds, no excuses |
| Single jurisdiction | Global, permissionless |
| Centralized custody | Self-custody, transparent |

Crypto enables:
- **Programmable money** — Automatic, trustless settlement
- **Global access** — Anyone with a wallet can participate
- **Transparency** — All stakes and outcomes on-chain
- **Composability** — Future integrations with DeFi, social, NFTs
- **Yield** — Locked stakes earn interest via Morpho

---

## Market Opportunity

### The Promise Market

Commitment isn't a feature — it's a **market**.

Every coach, gym buddy, AA sponsor, and accountability partner proves demand exists. People pay for someone to hold them to their word. Vaada makes that programmable.

**Market signals:**
- $15B+ spent on personal coaching annually
- Commitment partners are the #1 predictor of goal success
- 2x completion rates when money is on the line (behavioral econ)
- Prediction markets just proved crypto + stakes + outcomes = massive engagement

**Adjacent markets we pull from:**
- Fitness/wellness: **$96B**
- Prediction markets: **$65B**
- Habit/productivity apps: **$12B**
- Corporate wellness: **$56B**

Vaada isn't competing in these markets. We're creating **The Promise Market** — a new category where commitment meets capital.

### Competitive Landscape

| Competitor | Model | Limitation |
|------------|-------|------------|
| StickK | Pledge to charity | No upside for winners |
| Beeminder | Pay when you fail | Centralized, no community |
| DietBet | Weight loss pools | Single vertical, Web2 |
| Strava | Social fitness | No financial stakes |
| Polymarket | Predict others | Can't bet on yourself |

**Vaada's edge**: Bet on yourself + crypto-native + automated verification + yield on stakes.

---

## Roadmap

### Phase 1: Foundation ✅ Complete
- [x] Core staking contract (VaadaV3 deployed)
- [x] Strava integration (OAuth + miles verification)
- [x] Fitbit integration (OAuth + steps verification)
- [x] Chainlink Functions verification
- [x] Chainlink Automation for triggers
- [x] Anti-cheat filter (manual entries blocked)
- [x] Privy wallet integration (email/Google login)
- [x] NewUserChallenge contract (onboarding)
- [x] Morpho vault yield integration
- [x] Profile names & leaderboards
- [x] **Base Mainnet deployment**

### Phase 2: Growth (Current)
- [ ] First 100 users
- [ ] Multi-platform verification (GitHub, Duolingo)
- [ ] Social features (friends, groups, leagues)
- [ ] 10,000 users / $1M TVL

### Phase 3: Scale
- [ ] Mobile app
- [ ] B2B (corporate wellness, creator commitments)
- [ ] SDK for third-party integrations
- [ ] 100,000 users / $10M TVL

---

## Expansion Verticals

Vaada starts with fitness but the model applies to any verifiable commitment:

| Vertical | Verification Source | Status |
|----------|---------------------|--------|
| **Fitness (Steps)** | Fitbit | ✅ Live |
| **Fitness (Running)** | Strava | ✅ Live |
| **Fitness (Other)** | Apple Health, Garmin, Whoop | Planned |
| **Coding** | GitHub commits, contributions | Planned |
| **Learning** | Duolingo, course completions | Planned |
| **Finance** | Plaid (savings goals) | Planned |
| **Content** | YouTube uploads, Twitter posts | Planned |

Same contract. Different oracles. Infinite use cases.

---

## Team

**Solo Founder** — Shane Sarin
- UNC Chapel Hill, Economics
- Product @ Consensys (2023-2025)
- Analyst @ RECUR

Building in public. Shipping fast. Automating everything.

---

## Technical Details

### Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| VaadaV3 | `0xAc67E863221B703CEE9B440a7beFe71EA8725434` |
| GoalStakeAutomationV3 | `0xA6BcEcA41fCF743324a864F47dd03F0D3806341D` |
| NewUserChallenge | `0x7a2959ff82aeF587A6B8491A1816bb4BA7aEE554` |
| Morpho Vault | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

**Chainlink:** Functions Router `0xf9b8fc078197181c841c296c876945aaa425b278`, Subscription ID 132

### Stack

- **Chain**: Base (Coinbase L2) — Mainnet
- **Oracles**: Chainlink Functions + Automation
- **Yield**: Morpho Vault (Gauntlet USDC Prime)
- **Frontend**: Next.js 16, Privy (embedded wallets), wagmi
- **Verification**: Fitbit API + Strava API via Chainlink Functions
- **Token Storage**: Supabase (encrypted refresh tokens)

### Security Considerations

- Challenge funds held in audited ERC20 (USDC)
- Yield earned via Morpho vault (audited)
- Oracle limited to verification calls only
- Owner functions limited to parameter updates
- Anti-cheat: Only device-recorded activities count

### Known Limitations & Risks

**Data Integrity:**
- Fitbit/Strava data can be spoofed (GPS spoofing, phone shaking)
- Single data source per goal type creates single point of failure
- *Current mitigation:* Anti-cheat filters (manual activities blocked, device-recorded only)
- *Future mitigation:* Multi-source verification

**Oracle Trust:**
- Chainlink Functions executes off-chain JS code
- Oracle compromise could falsify results
- *Mitigation:* Transparent source code, Chainlink's decentralized network

**Smart Contract:**
- Contracts are unaudited MVP
- Bug bounty program planned
- Stake only what you can afford to lose

---

## Why Now?

1. **Post-Polymarket legitimacy** — Prediction markets are mainstream
2. **Base ecosystem growth** — Coinbase distribution, low fees
3. **Chainlink Functions maturity** — Reliable off-chain compute
4. **Consumer crypto moment** — People ready for useful dApps

The infrastructure is ready. The psychology is proven. The market is waiting.

---

## The Vision

Vaada becomes the **commitment layer for the internet**.

Every commitment — fitness, learning, work, habits — can have financial stakes attached. Not as punishment, but as **commitment devices** that help people become who they want to be.

We're not building a fitness app. We're building **The Promise Market**.

---

## Links

- **Website**: https://vaada.io
- **Admin**: https://vaada.io/admin
- **GitHub**: https://github.com/2shanez/vaada
- **BaseScan**: https://basescan.org/address/0xAc67E863221B703CEE9B440a7beFe71EA8725434
- **Contact**: shane@vaada.io

---

*"Bet on yourself."*
