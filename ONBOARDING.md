# Vaada Codebase Onboarding 🎯

*Last updated: 2026-02-13*

## What is Vaada?

A "commitment market" — users stake money on fitness goals. Hit your goal = keep your stake + split the losers' pool. Miss it = lose your stake to winners.

**Example:** 5 people stake $10 each on "Run 3 miles today." 3 succeed, 2 fail. Winners split the $50 pool = $16.67 each.

---

## Tech Stack

```
Frontend:     Next.js 14 (React) + TypeScript
Styling:      Tailwind CSS
Auth:         Privy (email/Google/wallet login)
Blockchain:   Base Sepolia (Ethereum L2 testnet)
Contracts:    Solidity (Foundry toolchain)
Oracles:      Chainlink Functions (verify fitness data)
Database:     Supabase (stores OAuth tokens)
Fitness APIs: Strava, Fitbit
Hosting:      Vercel
```

---

## Folder Structure

```
goalstake/
├── contracts/           # Solidity smart contracts
│   ├── src/
│   │   ├── GoalStakeV3.sol      # Main contract (goals, stakes, payouts)
│   │   └── GoalStakeAutomationV3.sol  # Oracle bridge (verification)
│   └── script/          # Deployment scripts
│
├── frontend/            # Next.js app
│   ├── src/
│   │   ├── app/         # Pages & API routes
│   │   │   ├── page.tsx           # Homepage
│   │   │   ├── dashboard/         # (placeholder)
│   │   │   ├── goal/[id]/         # Goal detail page
│   │   │   └── api/               # Backend endpoints
│   │   │       ├── fitbit/        # Fitbit OAuth + verification
│   │   │       ├── strava/        # Strava OAuth + verification
│   │   │       └── verify/        # Chainlink verification endpoint
│   │   │
│   │   ├── components/  # React components
│   │   │   ├── GoalCard.tsx       # Main goal display + join/claim
│   │   │   ├── BrowseGoals.tsx    # Homepage goal list (HARDCODED)
│   │   │   ├── FitbitConnect.tsx  # Fitbit OAuth button
│   │   │   └── StravaConnect.tsx  # Strava OAuth button
│   │   │
│   │   └── lib/         # Utilities
│   │       ├── wagmi.ts           # Wallet config + contract addresses
│   │       └── supabase.ts        # Database client
│   │
│   └── .env.local       # Secrets (API keys, etc.)
```

---

## Core Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. JOIN    │ →  │  2. DO IT   │ →  │  3. CLAIM   │
│             │    │             │    │             │
│ Connect     │    │ Run/Walk    │    │ Chainlink   │
│ wallet      │    │ (tracked by │    │ verifies    │
│ + Fitbit    │    │ Fitbit/     │    │ via API     │
│             │    │ Strava)     │    │             │
│ Stake $     │    │             │    │ Winners get │
│ (USDC)      │    │             │    │ paid out    │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Smart Contracts

### GoalStakeV3.sol
The main brain. Handles:
- `createGoal()` — admin creates goals with targets
- `joinGoal()` — user stakes USDC to participate
- `verifyParticipant()` — oracle reports if user hit target
- `settleGoal()` — lock in results after deadline
- `claimReward()` — winners withdraw their share

### GoalStakeAutomationV3.sol
Bridge between Chainlink and GoalStakeV3:
- Stores encrypted OAuth tokens on-chain
- Calls Chainlink Functions to verify fitness data
- Reports results back to GoalStakeV3

**Key addresses (Base Sepolia):**
```
GoalStakeV3:    0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9
AutomationV3:   0x6e6b1834afE0E221fB965edD69A7bC82C784f906
USDC:           0x036CbD53842c5426634e7929541eC2318f3dCF7e
Owner:          0xF36A29f563C3eE36dd48a2FA2c151D01d9E4E077
```

---

## Key Components

### GoalCard.tsx (~500 lines)
The workhorse. Handles:
- Displaying goal info (name, target, pool, deadline)
- Connect Fitbit/Strava flow
- Approve USDC + Join transaction
- Claim reward transaction
- Phase logic (Entry Open → Active → Verifying → Settled)

### BrowseGoals.tsx
**Currently hardcoded!** Goals are defined in this file, not fetched from chain. To add a goal:
1. Create on-chain with `cast send`
2. Add to `GOALS` array in this file

---

## Database (Supabase)

Two tables:
```sql
strava_tokens (
  wallet_address TEXT PRIMARY KEY,
  athlete_id BIGINT,
  refresh_token TEXT
)

fitbit_tokens (
  wallet_address TEXT PRIMARY KEY,
  user_id TEXT,
  refresh_token TEXT
)
```

OAuth tokens stored here so we can refresh + verify fitness data.

---

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/fitbit/auth` | Start Fitbit OAuth |
| `/api/fitbit/callback` | Handle OAuth redirect |
| `/api/fitbit/steps` | Get user's step count |
| `/api/strava/callback` | Handle Strava OAuth |
| `/api/strava/activities` | Get user's runs |
| `/api/verify` | Chainlink calls this to verify |

---

## Environment Variables

```bash
# Privy (auth)
NEXT_PUBLIC_PRIVY_APP_ID=

# Strava
NEXT_PUBLIC_STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=

# Fitbit
NEXT_PUBLIC_FITBIT_CLIENT_ID=
FITBIT_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Chainlink
CHAINLINK_SUBSCRIPTION_ID=561
```

---

## Common Tasks

### Add a new goal
```bash
# 1. Create on-chain
cast send 0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9 \
  "createGoal(string,uint256,uint256,uint256,uint256,uint8)" \
  "Goal Name" target stakeAmount entrySeconds durationSeconds goalType \
  --private-key $PK --rpc-url https://sepolia.base.org

# GoalType: 0 = STRAVA_MILES, 1 = FITBIT_STEPS

# 2. Add to frontend/src/components/BrowseGoals.tsx GOALS array
```

### Manual verification
```bash
cast send 0x6e6b1834afE0E221fB965edD69A7bC82C784f906 \
  "manualVerify(uint256,address,bool)" \
  goalId userAddress true/false \
  --private-key $PK --rpc-url https://sepolia.base.org
```

### Check goal status
```bash
cast call 0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9 \
  "getGoal(uint256)" goalId \
  --rpc-url https://sepolia.base.org
```

### Check participant status
```bash
cast call 0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9 \
  "getParticipant(uint256,address)" goalId walletAddress \
  --rpc-url https://sepolia.base.org
```

### Settle a goal
```bash
cast send 0x6e6b1834afE0E221fB965edD69A7bC82C784f906 \
  "settleGoal(uint256)" goalId \
  --private-key $PK --rpc-url https://sepolia.base.org
```

### Check Fitbit steps for a wallet
```bash
curl "https://vaada.io/api/fitbit/steps?wallet=ADDRESS&date=YYYY-MM-DD&target=5000"
```

---

## What's Hardcoded (Tech Debt)

1. **Goals in BrowseGoals.tsx** — should fetch from chain
2. **Goal types** — only STRAVA_MILES and FITBIT_STEPS
3. **Manual verification** — Chainlink automation flaky on testnet
4. **Single chain** — Base Sepolia only

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ BrowseGoals │  │  GoalCard   │  │FitbitConnect│       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │               │                │               │
│         └───────────────┴────────────────┘               │
│                         │                                 │
│              ┌──────────┴──────────┐                     │
│              │    API Routes       │                     │
│              │  /api/fitbit/steps  │                     │
│              │  /api/verify        │                     │
│              └──────────┬──────────┘                     │
└─────────────────────────┼────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Supabase │    │ Fitbit   │    │   Base   │
   │ (tokens) │    │   API    │    │ Sepolia  │
   └──────────┘    └──────────┘    └──────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                          ▼                             ▼
                   ┌─────────────┐              ┌─────────────┐
                   │GoalStakeV3  │◄────────────│AutomationV3 │
                   │ (stakes,    │  verifies   │ (Chainlink  │
                   │  payouts)   │             │  bridge)    │
                   └─────────────┘              └─────────────┘
```

---

## FAQ

**Q: How do users get USDC?**
A: Testnet faucet or we send them some. Mainnet = buy/bridge.

**Q: Why Chainlink?**
A: Smart contracts can't call external APIs. Chainlink is a trusted oracle that fetches fitness data and reports back.

**Q: Why Privy over RainbowKit?**
A: Privy supports email/Google login. Normies don't have wallets.

**Q: Why Base?**
A: Cheap gas, Coinbase ecosystem, easy fiat onramp later.

**Q: Why are goals hardcoded?**
A: MVP speed. Proper solution = fetch from chain events or indexer.

---

## Links

- **Live site:** https://vaada.io
- **Repo:** https://github.com/2shanez/vaada
- **Supabase:** https://tpywycrijconvtybgxuw.supabase.co
- **Chainlink Sub:** 561
- **BaseScan:** https://sepolia.basescan.org/address/0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9
