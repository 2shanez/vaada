# GoalStake

**Bet on your goals. Prove yourself. Get paid.**

Stake money on your fitness goals. Hit them, keep your stake + bonus from losers. Miss them, lose it. Verified by Chainlink oracles, settled automatically.

## Tech Stack

- **Smart Contracts**: Solidity (Foundry)
- **Chain**: Base (Ethereum L2)
- **Oracle**: Chainlink Functions
- **Yield**: Aave v3
- **Frontend**: Next.js + wagmi + RainbowKit
- **Fitness Data**: Strava API

## Project Structure

```
goalstake/
├── contracts/       # Solidity smart contracts
├── frontend/        # Next.js app
├── scripts/         # Deploy & test scripts
├── chainlink/       # Chainlink Functions source
├── docs/            # Documentation
└── README.md
```

## MVP Features

- [ ] Stake USDC on a running goal
- [ ] Connect Strava account
- [ ] Chainlink verifies miles at deadline
- [ ] Auto-settle: winners get stake + loser pool share
- [ ] Funds earn yield while staked (Aave)

## Getting Started

Coming soon...

## License

MIT
