# Chainlink Functions Integration

This folder contains the Chainlink Functions code for verifying Strava activity data.

## Overview

The verification flow:

```
1. User creates challenge on GoalStake contract
2. User connects Strava OAuth and stores encrypted token
3. Challenge deadline passes
4. Keeper calls requestVerification()
5. Off-chain service fetches Strava data via API
6. Keeper calls fulfillVerification() with miles data
7. GoalStake settles the challenge (win/lose)
```

## Files

- `strava-verifier.js` - Chainlink Functions source code that fetches Strava data

## Strava API

The verifier calls:
```
GET https://www.strava.com/api/v3/athlete/activities
```

Parameters:
- `after` - Start timestamp (challenge creation)
- `before` - End timestamp (challenge deadline)
- `per_page` - Max activities to fetch

Response filtering:
- Only counts activities where `type === "Run"`
- Sums `distance` field (in meters)
- Converts to miles (÷ 1609.34)

## Production Setup

For production deployment with Chainlink Functions:

1. Create a Chainlink Functions subscription on Base
2. Fund subscription with LINK
3. Deploy oracle contract with Functions Router address
4. Upload JavaScript source to IPFS or inline
5. Configure DON ID and subscription ID

## Testing

For testnet/local testing, the oracle can be called directly:
```solidity
oracle.fulfillVerification(challengeId, actualMiles);
```

This simulates what Chainlink Functions would return.
