# Vaada: The Commitment Market

**Version 1.0 — February 2026**

---

## Abstract

Vaada is a decentralized commitment protocol that allows users to stake money on personal goals. Users commit USDC to fitness challenges verified by Strava data through Chainlink oracles. Hit your goal, keep your stake plus earn from those who didn't. Miss it, your stake goes to the winners.

This is the "put your money where your mouth is" protocol.

*"Vaada" means "promise" in Hindi.*

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

1. **Stake** — Commit USDC to a fitness goal (e.g., "Run 10 miles this week")
2. **Perform** — Complete your activity on Strava
3. **Verify** — Chainlink Functions automatically fetch your Strava data
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
| Fitness | Strava, Apple Health | Stake on miles, workouts |
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
   VaadaStake.sol (holds funds, tracks challenges)
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

**For Users:**
- **Winners**: Receive stake back + proportional share of loser pool (based on stake size)
- **Losers**: Stake distributed to winners weighted by their stakes
- **Fee**: 0% — platform never touches user stakes

**Stake-Weighted Payouts:**
Winners receive bonus proportional to their stake. If you stake more, you earn more from the loser pool.

```
Your Bonus = (Your Stake / Total Winner Stakes) × Loser Pool
```

Example: If you stake $100 and total winner stakes are $500, you get 20% of the loser pool.

**Tiered Stakes (10x ratio):**
| Goal Type | Min | Max |
|-----------|-----|-----|
| Test | $1 | $10 |
| Daily | $5 | $50 |
| Weekly | $10 | $100 |
| Monthly | $20 | $200 |

This ensures fair reward distribution while preventing whale domination.

**Platform Revenue:**
- All staked USDC is deposited into yield protocols (Aave, Compound, etc.)
- Platform earns interest on TVL while funds are locked
- Users get their full stakes back; platform keeps the yield

This creates:
- **Zero-fee UX** — users keep 100% of winnings
- **Sustainable revenue** — scales with TVL and challenge duration
- **Aligned incentives** — platform benefits from more stakes locked longer

**Fee Policy:**
0% platform fee at launch. Future fees (if any) will be introduced transparently as the protocol scales.

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

---

## Market Opportunity

### The Commitment Market

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

Vaada isn't competing in these markets. We're creating **The Commitment Market** — a new category where commitment meets capital.

### Competitive Landscape

| Competitor | Model | Limitation |
|------------|-------|------------|
| StickK | Pledge to charity | No upside for winners |
| Beeminder | Pay when you fail | Centralized, no community |
| DietBet | Weight loss pools | Single vertical, Web2 |
| Strava | Social fitness | No financial stakes |
| Polymarket | Predict others | Can't bet on yourself |

**Vaada's edge**: Bet on yourself + crypto-native + automated verification.

---

## Roadmap

### Phase 1: Foundation (Current)
- [x] Core staking contract (GoalStakeV3 deployed)
- [x] Strava integration (OAuth + on-chain token storage)
- [x] Chainlink Functions verification
- [x] Chainlink Automation for triggers
- [x] Anti-cheat filter (manual entries blocked)
- [x] Privy wallet integration (email/Google login)
- [ ] First 100 users

### Phase 2: Growth
- [ ] Multi-platform verification (GitHub, YouTube, Duolingo)
- [ ] Social features (friends, groups, leagues)
- [ ] Mobile app
- [ ] 10,000 users / $1M TVL

### Phase 3: Scale
- [ ] B2B (corporate wellness, creator commitments)
- [ ] SDK for third-party integrations
- [ ] Token/governance (if aligned)
- [ ] 100,000 users / $10M TVL

---

## Expansion Verticals

Vaada starts with fitness but the model applies to any verifiable commitment:

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
- Analyst @ RECUR

Building in public. Shipping fast. Automating everything.

---

## Technical Details

### Contracts (Base Sepolia)

- **GoalStakeV3**: `0x13b8eaEb7F7927527CE1fe7A600f05e61736d217`
- **AutomationV3**: `0xB10fCE97fc6eE84ff7772Bc44A651Dd076F7180D`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Stack

- **Chain**: Base (Coinbase L2)
- **Oracles**: Chainlink Functions + Automation
- **Frontend**: Next.js, Privy (embedded wallets), wagmi
- **Verification**: Strava API via Chainlink

### Security Considerations

- Challenge funds held in audited ERC20 (USDC)
- Oracle limited to verification calls only
- Owner functions limited to parameter updates
- No upgradability (immutable MVP)

### Known Limitations & Risks

**Data Integrity:**
- Strava data can be spoofed (GPS spoofing, fake activities)
- Single data source creates single point of failure
- *Future mitigation:* Multi-source verification (Strava + Apple Health + GPS trail analysis)

**Economic Gaming:**
- Retroactive staking (run first, stake after) — mitigated by only counting post-stake activities
- Sybil attacks (multiple accounts) — mitigated by minimum stakes, future identity verification
- Small stake farming — self-limiting when loser pool is empty

**Oracle Trust:**
- Chainlink Functions executes off-chain JS code
- Oracle compromise could falsify results
- *Mitigation:* Transparent source code, Chainlink's decentralized network

**Smart Contract:**
- MVP contracts are unaudited
- Mainnet deployment will require professional audit
- Bug bounty program planned for launch

**General:**
- Early stage product — expect bugs and iterations
- Not financial advice — stake only what you can afford to lose

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

We're not building a fitness app. We're building **The Commitment Market**.

---

## Links

- **Website**: https://vaada.io
- **GitHub**: https://github.com/2shanez/vaada
- **Twitter**: [@vaaborhood](https://twitter.com/vaaborhood)
- **Contact**: shane@vaada.io

---

*"Bet on yourself."*
