# Chainlink Automation + Functions Setup

This guide explains how to set up automated challenge verification using Chainlink.

## Overview

1. **Chainlink Automation** - Monitors for challenges past deadline
2. **Chainlink Functions** - Fetches Strava data to verify miles

## Prerequisites

- Base Sepolia ETH for gas
- LINK tokens for Chainlink services
- Chainlink Functions subscription

## Step 1: Get LINK Tokens

1. Go to [Base Sepolia Faucet](https://faucets.chain.link/base-sepolia)
2. Connect wallet and request LINK tokens

## Step 2: Create Chainlink Functions Subscription

1. Go to [Chainlink Functions](https://functions.chain.link/)
2. Connect wallet (Base Sepolia)
3. Click "Create Subscription"
4. Fund subscription with LINK (recommend 5+ LINK)
5. Note your **Subscription ID**

## Step 3: Deploy GoalStakeAutomation Contract

```bash
cd contracts

# Set environment variables
export ROUTER="0xf9B8fc078197181C841c296C876945aaa425B278" # Base Sepolia Functions Router
export DON_ID="0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000" # Base Sepolia DON ID
export SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
export GOALSTAKE_ADDRESS="0xdC9ee5e9E99e3568D2B5eA9409222fbFeCB56373"

# Deploy
forge create src/GoalStakeAutomation.sol:GoalStakeAutomation \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $ROUTER $GOALSTAKE_ADDRESS $DON_ID $SUBSCRIPTION_ID
```

## Step 4: Configure the Contract

```bash
# Add contract as consumer to your Functions subscription
# Go to functions.chain.link > Your Subscription > Add Consumer > Paste contract address

# Set the JavaScript source code
cast send $AUTOMATION_CONTRACT "setFunctionsSource(bytes)" \
  $(cat ../chainlink/strava-verifier.js | xxd -p | tr -d '\n') \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Update GoalStake to use new oracle
cast send $GOALSTAKE_ADDRESS "setOracle(address)" $AUTOMATION_CONTRACT \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

## Step 5: Register with Chainlink Automation

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Connect wallet (Base Sepolia)
3. Click "Register new Upkeep"
4. Select "Custom logic"
5. Enter your GoalStakeAutomation contract address
6. Set gas limit: 500000
7. Fund with LINK (recommend 5+ LINK)
8. Complete registration

## Step 6: Test

1. Create a challenge on the frontend
2. Wait for deadline to pass (or create with short duration for testing)
3. Watch Chainlink Automation trigger verification
4. Check challenge status on frontend

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Functions Router | `0xf9B8fc078197181C841c296C876945aaa425B278` |
| DON ID | `0x66756e2d626173652d7365706f6c69612d31` |
| GoalStake | `0xdC9ee5e9E99e3568D2B5eA9409222fbFeCB56373` |
| GoalStakeAutomation | (deploy and fill in) |

## Troubleshooting

### Upkeep not triggering
- Check LINK balance in Automation subscription
- Verify contract is registered correctly
- Check `checkUpkeep()` returns true for pending challenges

### Functions request failing
- Check LINK balance in Functions subscription
- Verify contract is added as consumer
- Check Strava token is valid
- Review Functions error logs on chain

### Strava API errors
- Token may have expired (need refresh token logic)
- Rate limits exceeded
- Invalid activity data

## Production Considerations

1. **Token Security**: Encrypt Strava tokens before storing on-chain
2. **Refresh Tokens**: Implement token refresh logic
3. **Error Handling**: Add retry logic for failed verifications
4. **Gas Optimization**: Batch multiple verifications
5. **Monitoring**: Set up alerts for failed upkeeps
