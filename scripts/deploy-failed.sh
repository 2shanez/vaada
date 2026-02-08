#!/bin/bash

# Redeploy failed goals with delays
CONTRACT="0x13b8eaEb7F7927527CE1fe7A600f05e61736d217"
RPC="https://sepolia.base.org"

NOW=$(date +%s)
ENTRY_7D=$((NOW + 7*24*60*60))
ENTRY_14D=$((NOW + 14*24*60*60))
ENTRY_30D=$((NOW + 30*24*60*60))

DAILY=$((NOW + 8*24*60*60))
WEEKEND=$((NOW + 10*24*60*60))
WEEKLY=$((NOW + 14*24*60*60))
MONTHLY=$((NOW + 37*24*60*60))
TWO_MONTHS=$((NOW + 67*24*60*60))
THREE_MONTHS=$((NOW + 97*24*60*60))

# USDC (6 decimals)
USDC_5="5000000"
USDC_10="10000000"
USDC_15="15000000"
USDC_20="20000000"
USDC_25="25000000"
USDC_50="50000000"
USDC_75="75000000"
USDC_100="100000000"
USDC_150="150000000"
USDC_200="200000000"
USDC_300="300000000"
USDC_500="500000000"

# Values (18 decimals)
MILES_10="10000000000000000000"
MILES_100="100000000000000000000"
STEPS_10K="10000000000000000000000"
STEPS_300K="300000000000000000000000"
LESSONS_1="1000000000000000000"
LESSONS_7="7000000000000000000"
PERCENT_4="4000000000000000000"
PERCENT_6="6000000000000000000"
PERCENT_10="10000000000000000000"

if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: export PRIVATE_KEY=0x..."
    exit 1
fi

echo "=== Redeploying 9 Failed Goals (with 5s delays) ==="

echo "1/9: Weekend Warrior"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Weekend Warrior" $MILES_10 $USDC_10 $USDC_100 $NOW $ENTRY_7D $WEEKEND \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "2/9: Marathon Prep"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Marathon Prep" $MILES_100 $USDC_20 $USDC_200 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "3/9: 10K Steps"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "10K Steps" $STEPS_10K $USDC_5 $USDC_25 $NOW $ENTRY_7D $DAILY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "4/9: 300K Month"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "300K Month" $STEPS_300K $USDC_25 $USDC_150 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "5/9: Daily Streak"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Daily Streak" $LESSONS_1 $USDC_5 $USDC_25 $NOW $ENTRY_7D $DAILY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "6/9: Language Learner"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Language Learner" $LESSONS_7 $USDC_10 $USDC_50 $NOW $ENTRY_7D $WEEKLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "7/9: Lose 4%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 4%" $PERCENT_4 $USDC_25 $USDC_150 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "8/9: Lose 6%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 6%" $PERCENT_6 $USDC_50 $USDC_300 $NOW $ENTRY_30D $TWO_MONTHS \
    --rpc-url $RPC --private-key $PRIVATE_KEY
sleep 5

echo "9/9: Lose 10%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 10%" $PERCENT_10 $USDC_100 $USDC_500 $NOW $ENTRY_30D $THREE_MONTHS \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo ""
echo "=== Done! Check goal count: ==="
echo "cast call $CONTRACT 'goalCount()' --rpc-url $RPC"
