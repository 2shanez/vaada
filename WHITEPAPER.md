# GoalStake: The Accountability Market

**Version 1.0 — February 2026**

---

## Abstract

GoalStake is a decentralized accountability protocol that allows users to stake money on personal goals. Users commit USDC to fitness challenges verified by Strava data through Chainlink oracles. Hit your goal, keep your stake plus earn from those who didn't. Miss it, your stake goes to the winners.

This is the "put your money where your mouth is" protocol.

---

## The Problem

**$72 billion** is spent annually on fitness and self-improvement. Yet:

- 92% of people fail their New Year's resolutions
- 50% of gym memberships go unused
- Fitness apps have <5% long-term retention

The missing ingredient isn't information or access — it's **accountability with real stakes**.

Behavioral economics shows loss aversion is 2x stronger than gain motivation. People work harder to avoid losing $100 than to gain $100. GoalStake weaponizes this.

---

## The Solution

GoalStake creates **financial accountability** for personal goals:

1. **Stake** — Commit USDC to a fitness goal (e.g., "Run 10 miles this week")
2. **Perform** — Complete your activity on Strava
3. **Verify** — Chainlink Functions automatically fetch your Strava data
4. **Settle** — Hit your goal = stake returned + bonus from losers. Miss = stake distributed to winners.

No middleman. No refunds. No excuses.

---

## How It Works

### Smart Contract Architecture

```
User Stakes USDC
       ↓
   GoalStake.sol (holds funds, tracks challenges)
       ↓
   Deadline Reached
       ↓
   Chainlink Automation (triggers verification)
       ↓
   Chainlink Functions (fetches Strava API)
       ↓
   verifyChallenge(id, actualMiles)
       ↓
   Settlement (winner paid, loser slashed)
```

### Economic Model

- **Winners**: Receive stake back + 10% of the loser pool
- **Losers**: Stake added to loser pool
- **Protocol**: 0% fee (MVP), potential 5-10% fee at scale

This creates a **positive-sum game for winners** funded by those who don't follow through.

---

## Why Crypto?

| Traditional Apps | GoalStake |
|------------------|-----------|
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

---

## Market Opportunity

### The Accountability Market

Accountability isn't a feature — it's a **market**.

Every coach, gym buddy, AA sponsor, and accountability partner proves demand exists. People pay for someone to hold them to their word. GoalStake makes that programmable.

**Market signals:**
- $15B+ spent on personal coaching annually
- Accountability partners are the #1 predictor of goal success
- 2x completion rates when money is on the line (behavioral econ)
- Prediction markets just proved crypto + stakes + outcomes = massive engagement

**Adjacent markets we pull from:**
- Fitness/wellness: **$96B**
- Prediction markets: **$65B**
- Habit/productivity apps: **$12B**
- Corporate wellness: **$56B**

GoalStake isn't competing in these markets. We're creating **The Accountability Market** — a new category where commitment meets capital.

### Competitive Landscape

| Competitor | Model | Limitation |
|------------|-------|------------|
| StickK | Pledge to charity | No upside for winners |
| Beeminder | Pay when you fail | Centralized, no community |
| DietBet | Weight loss pools | Single vertical, Web2 |
| Strava | Social fitness | No financial stakes |
| Polymarket | Predict others | Can't bet on yourself |

**GoalStake's edge**: Bet on yourself + crypto-native + automated verification.

---

## Roadmap

### Phase 1: Foundation (Current)
- [x] Core staking contract
- [x] Strava integration
- [x] Chainlink Functions verification
- [ ] Chainlink Automation for triggers
- [ ] First 100 users

### Phase 2: Growth
- [ ] Multi-platform verification (GitHub, YouTube, Duolingo)
- [ ] Social features (friends, groups, leagues)
- [ ] Mobile app
- [ ] 10,000 users / $1M TVL

### Phase 3: Scale
- [ ] B2B (corporate wellness, creator accountability)
- [ ] SDK for third-party integrations
- [ ] Token/governance (if aligned)
- [ ] 100,000 users / $10M TVL

---

## Expansion Verticals

GoalStake starts with fitness but the model applies to any verifiable commitment:

| Vertical | Verification Source |
|----------|---------------------|
| **Fitness** | Strava, Apple Health, Garmin |
| **Coding** | GitHub commits, contributions |
| **Learning** | Duolingo, course completions |
| **Finance** | Plaid (savings goals) |
| **Content** | YouTube uploads, Twitter posts |
| **Location** | GPS check-ins (gym, office) |

Same contract. Different oracles. Infinite use cases.

---

## Team

**Solo Founder** — Shane Sarin
- UNC Chapel Hill, Economics
- Product @ Consensys (2023-2025)
- Founding team @ RECUR

Building in public. Shipping fast. Automating everything.

---

## Technical Details

### Contracts (Base Sepolia)

- **GoalStake**: `0x36842e04C5b1CBD0cD0bdF4E44c27EB42EBF3eAC`
- **Automation**: `0x8E69bf57b08992204317584b5e906c1B6e6E609E`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Stack

- **Chain**: Base (Coinbase L2)
- **Oracles**: Chainlink Functions + Automation
- **Frontend**: Next.js, RainbowKit, wagmi
- **Verification**: Strava API via Chainlink

### Security Considerations

- Challenge funds held in audited ERC20 (USDC)
- Oracle limited to verification calls only
- Owner functions limited to parameter updates
- No upgradability (immutable MVP)

---

## Why Now?

1. **Post-Polymarket legitimacy** — Prediction markets are mainstream
2. **Base ecosystem growth** — Coinbase distribution, low fees
3. **Chainlink Functions maturity** — Reliable off-chain compute
4. **Consumer crypto moment** — People ready for useful dApps

The infrastructure is ready. The psychology is proven. The market is waiting.

---

## The Vision

GoalStake becomes the **accountability layer for the internet**.

Every commitment — fitness, learning, work, habits — can have financial stakes attached. Not as punishment, but as **commitment devices** that help people become who they want to be.

We're not building a fitness app. We're building **The Accountability Market**.

---

## Links

- **Website**: https://goalstake.co
- **GitHub**: https://github.com/2shanez/goalstake
- **Twitter**: [@GoalStake](https://twitter.com/goalstake)
- **Contact**: shane@goalstake.co

---

*"Bet on yourself."*
