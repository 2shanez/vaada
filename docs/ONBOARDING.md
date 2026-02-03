# Vaada - New Employee Onboarding Guide

**Last Updated:** February 3, 2026  
**Version:** MVP (Testnet)

---

## 🎯 What is Vaada?

**Vaada** (Hindi for "promise") is a fitness commitment platform where users stake money on their running goals. Complete your goal → get your money back (plus winnings from those who fail). Miss it → lose your stake.

**Tagline:** "Stake your word"  
**Positioning:** "The Commitment Market"

### The Problem
- 80% of New Year's fitness resolutions fail by February
- Existing apps use streaks and badges (weak motivation)
- No real consequences for quitting

### The Solution
- Put real money on the line
- Automated verification via Strava (no cheating)
- Social accountability through shared goals
- Financial upside from others' failures

---

## 🏗️ How It Works

### User Flow
1. **Connect wallet** (Coinbase, MetaMask, or email via Privy)
2. **Connect Strava** (links running activity)
3. **Join a goal** (e.g., "Run 10 miles this week")
4. **Stake USDC** ($1-$100 range)
5. **Complete runs** (tracked by Strava)
6. **Automated verification** (Chainlink reads Strava API)
7. **Settlement** (winners split losers' stakes)

### Goal Phases
1. **Entry Phase** - Users can join and stake
2. **Competition Phase** - Run and track progress
3. **Verification Phase** - Chainlink verifies Strava data
4. **Settlement Phase** - Winners claim rewards

---

## 💰 Business Model

### Current (MVP)
- **0% platform fee** (growth mode)
- Revenue = $0

### Future
- **10-15% platform fee** on loser stakes
- **Premium features** (custom goals, teams, analytics)
- **B2B** (corporate wellness programs)

### Unit Economics (Target)
- Average stake: $25
- Average goal: 4 participants
- Loss rate: 40%
- Revenue per goal: $25 × 4 × 40% × 15% = $6

---

## 🔧 Technical Architecture

### Stack Overview
```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js 16 + React 19 + Tailwind + Privy Auth  │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              Smart Contracts (Base)              │
│  GoalStakeV3 + AutomationV3 (Solidity 0.8.20)   │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│            Chainlink Automation                  │
│  Checks deadlines → Triggers verification        │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│            Chainlink Functions                   │
│  Fetches Strava API → Returns miles on-chain    │
└─────────────────────────────────────────────────┘
```

### Smart Contracts (Base Sepolia Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| GoalStakeV3 | `0x13b8eaEb7F7927527CE1fe7A600f05e61736d217` | Main contract - goals, stakes, claims |
| AutomationV3 | `0xB10fCE97fc6eE84ff7772Bc44A651Dd076F7180D` | Chainlink integration - verification |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Staking token (Base Sepolia USDC) |

### Key Contract Functions

**GoalStakeV3:**
- `createGoal()` - Create a new goal (admin)
- `joinGoal(goalId, stake)` - Join with USDC stake
- `verifyParticipant(goalId, user, miles)` - Record verified miles (oracle only)
- `settleGoal(goalId)` - Finalize and enable claims
- `claimReward(goalId)` - Winner withdraws stake + winnings
- `getGoal(goalId)` - Read goal details
- `getParticipant(goalId, user)` - Read user's status

**AutomationV3:**
- `storeToken(token)` - User stores Strava access token
- `checkUpkeep()` - Chainlink calls to check if verification needed
- `performUpkeep()` - Chainlink calls to trigger verification
- `manualVerify()` - Admin override for testing

### Chainlink Integration

**Functions Subscription:** ID 561  
**DON ID:** `fun-base-sepolia-1`  
**Router:** `0xf9B8fc078197181C841c296C876945aaa425B278`

**Strava Verifier Logic** (`chainlink/strava-verifier.js`):
1. Receives: Strava token, start timestamp, end timestamp
2. Fetches: `/api/v3/athlete/activities` from Strava
3. Filters: Only `type === "Run"` and `manual === false`
4. Sums: Total distance in miles
5. Returns: Miles with 18 decimals (1 mile = 1e18)

### Anti-Cheat Measures
- **Device-only runs:** `manual === false` filter
- **Activity type:** Must be "Run" (not "Ride", "Walk", etc.)
- **Time window:** Only activities during competition period
- **On-chain verification:** Chainlink decentralized oracles

---

## 📁 Repository Structure

```
vaada/
├── contracts/              # Smart contracts (Foundry)
│   ├── src/
│   │   ├── GoalStakeV3.sol      # Main contract
│   │   ├── GoalStakeAutomationV3.sol  # Chainlink automation
│   │   └── ...
│   ├── script/             # Deployment scripts
│   ├── test/               # Contract tests
│   └── foundry.toml        # Foundry config
│
├── frontend/               # Next.js app
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # React components
│   │   │   ├── GoalCard.tsx     # Goal display + join flow
│   │   │   ├── BrowseGoals.tsx  # Goal list (hardcoded for now)
│   │   │   └── ...
│   │   └── lib/
│   │       ├── wagmi.ts    # Contract addresses + config
│   │       └── strava.ts   # Strava OAuth helpers
│   └── package.json
│
├── chainlink/              # Chainlink Functions source
│   ├── strava-verifier.js  # JavaScript run on Chainlink nodes
│   └── SETUP.md
│
├── docs/                   # Documentation
│   ├── ONBOARDING.md       # This file
│   └── WHITEPAPER.md       # Product vision
│
└── .env                    # Environment variables (not in git)
```

---

## 🔑 Key Accounts & Services

### Wallets
- **Owner/Deployer:** `0xF36A29f563C3eE36dd48a2FA2c151D01d9E4E077` (Coinbase Wallet)

### External Services
| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Vercel | Frontend hosting | vercel.com |
| Chainlink Functions | Strava API oracle | functions.chain.link |
| Chainlink Automation | Scheduled triggers | automation.chain.link |
| Strava API | Activity data | strava.com/settings/api |
| Privy | Wallet + auth | privy.io |
| BaseScan | Block explorer | sepolia.basescan.org |

### Strava API
- **Client ID:** 199295
- **Athlete ID (Shane):** 203834290
- **Scopes:** `activity:read_all`

---

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- Foundry (forge, cast, anvil)
- Git

### Local Development

```bash
# Clone repo
git clone https://github.com/2shanez/vaada.git
cd vaada

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000

# Contracts
cd ../contracts
forge build
forge test
```

### Useful Commands

```bash
# Check goal details
cast call 0x13b8eaEb7F7927527CE1fe7A600f05e61736d217 "getGoal(uint256)" <GOAL_ID> --rpc-url https://sepolia.base.org

# Check participant status
cast call 0x13b8eaEb7F7927527CE1fe7A600f05e61736d217 "getParticipant(uint256,address)" <GOAL_ID> <USER_ADDRESS> --rpc-url https://sepolia.base.org

# Manual verification (owner only)
cast send 0xB10fCE97fc6eE84ff7772Bc44A651Dd076F7180D "manualVerify(uint256,address,uint256)" <GOAL_ID> <USER_ADDRESS> <MILES_WEI> --rpc-url https://sepolia.base.org --private-key <KEY>
```

---

## 📊 Current Status

### What Works
- ✅ Create goals with entry windows
- ✅ Join goals with USDC stake
- ✅ Connect Strava for verification
- ✅ Chainlink automation + functions
- ✅ Manual verification path
- ✅ Claim rewards

### Known Limitations
- Goals are hardcoded in frontend (not dynamic)
- No claim UI yet (terminal only)
- Single-chain (Base Sepolia only)
- No refresh token for Strava

### Roadmap
1. **Now:** Friends & family testing
2. **Q1 2026:** Mainnet launch (Base)
3. **Q2 2026:** Multi-activity support (cycling, swimming)
4. **Q3 2026:** Team challenges, corporate wellness
5. **Q4 2026:** Mobile app

---

## 🆘 Troubleshooting

### "Entry Closed" on goal
- Entry deadline passed. Create new goal or wait for next cycle.

### Verification not triggering
- Check Chainlink Automation dashboard
- Ensure Strava token is stored on-chain
- Can manually trigger with `manualVerify()`

### Transaction failing
- Check USDC balance and allowance
- Ensure on Base Sepolia network
- Check gas (need ETH for gas)

### Strava not connecting
- Clear cookies and retry OAuth flow
- Check Strava app permissions

---

## 📞 Contacts

- **Founder:** Shane Sarin (shanesarin@gmail.com)
- **GitHub:** github.com/2shanez/vaada
- **Site:** https://vaada.io (password: `vaada2026`)

---

*Welcome to Vaada! Let's make fitness commitments real.* 🏃‍♂️💰
