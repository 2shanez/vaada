#!/bin/bash

# Deploy all 14 Vaada goals to GoalStakeV3
# Contract: 0x13b8eaEb7F7927527CE1fe7A600f05e61736d217
# RPC: https://sepolia.base.org

CONTRACT="0x13b8eaEb7F7927527CE1fe7A600f05e61736d217"
RPC="https://sepolia.base.org"

# Current timestamp
NOW=$(date +%s)
# Entry deadline: 7 days from now
ENTRY_7D=$((NOW + 7*24*60*60))
# Entry deadline: 14 days from now
ENTRY_14D=$((NOW + 14*24*60*60))
# Entry deadline: 30 days from now
ENTRY_30D=$((NOW + 30*24*60*60))

# Deadlines (from entry deadline)
DAILY=$((NOW + 8*24*60*60))        # 8 days (7 entry + 1 day)
WEEKEND=$((NOW + 10*24*60*60))     # 10 days (7 entry + 3 days)
WEEKLY=$((NOW + 14*24*60*60))      # 14 days (7 entry + 7 days)
MONTHLY=$((NOW + 37*24*60*60))     # 37 days (7 entry + 30 days)
TWO_MONTHS=$((NOW + 67*24*60*60))  # 67 days (7 entry + 60 days)
THREE_MONTHS=$((NOW + 97*24*60*60)) # 97 days (7 entry + 90 days)

# USDC decimals (6)
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

# Miles in 18 decimals (1 mile = 1e18)
MILES_1="1000000000000000000"
MILES_3="3000000000000000000"
MILES_10="10000000000000000000"
MILES_15="15000000000000000000"
MILES_50="50000000000000000000"
MILES_100="100000000000000000000"

# Steps (just the number, no decimals needed for counting)
STEPS_10K="10000000000000000000000"      # 10,000 in 18 decimals
STEPS_70K="70000000000000000000000"      # 70,000 in 18 decimals
STEPS_300K="300000000000000000000000"    # 300,000 in 18 decimals

# Duolingo (lessons/days)
LESSONS_1="1000000000000000000"
LESSONS_7="7000000000000000000"
DAYS_30="30000000000000000000"

# Weight loss % (just use integer for now, contract can interpret)
PERCENT_4="4000000000000000000"
PERCENT_6="6000000000000000000"
PERCENT_10="10000000000000000000"

echo "=== Deploying 14 Vaada Goals ==="
echo "Contract: $CONTRACT"
echo "Start time: $NOW"
echo ""

# Check for private key
if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: Set PRIVATE_KEY environment variable"
    echo "export PRIVATE_KEY=0x..."
    exit 1
fi

# ═══════════════════════════════════════════
# RUNNING GOALS (5)
# ═══════════════════════════════════════════

echo "1/14: Daily 3 (3 miles)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Daily 3" $MILES_3 $USDC_5 $USDC_50 $NOW $ENTRY_7D $DAILY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "2/14: Weekend Warrior (10 miles)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Weekend Warrior" $MILES_10 $USDC_10 $USDC_100 $NOW $ENTRY_7D $WEEKEND \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "3/14: Weekly 15 (15 miles)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Weekly 15" $MILES_15 $USDC_10 $USDC_100 $NOW $ENTRY_7D $WEEKLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "4/14: February 50 (50 miles)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "February 50" $MILES_50 $USDC_20 $USDC_200 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "5/14: Marathon Prep (100 miles)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Marathon Prep" $MILES_100 $USDC_20 $USDC_200 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

# ═══════════════════════════════════════════
# STEPS GOALS (3)
# ═══════════════════════════════════════════

echo "6/14: 10K Steps"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "10K Steps" $STEPS_10K $USDC_5 $USDC_25 $NOW $ENTRY_7D $DAILY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "7/14: 70K Week"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "70K Week" $STEPS_70K $USDC_15 $USDC_75 $NOW $ENTRY_7D $WEEKLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "8/14: 300K Month"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "300K Month" $STEPS_300K $USDC_25 $USDC_150 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

# ═══════════════════════════════════════════
# DUOLINGO GOALS (3)
# ═══════════════════════════════════════════

echo "9/14: Daily Streak (1 lesson)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Daily Streak" $LESSONS_1 $USDC_5 $USDC_25 $NOW $ENTRY_7D $DAILY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "10/14: Language Learner (7 lessons)"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Language Learner" $LESSONS_7 $USDC_10 $USDC_50 $NOW $ENTRY_7D $WEEKLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "11/14: 30 Day Streak"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "30 Day Streak" $DAYS_30 $USDC_25 $USDC_100 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

# ═══════════════════════════════════════════
# WEIGHT GOALS (3)
# ═══════════════════════════════════════════

echo "12/14: Lose 4%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 4%" $PERCENT_4 $USDC_25 $USDC_150 $NOW $ENTRY_14D $MONTHLY \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "13/14: Lose 6%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 6%" $PERCENT_6 $USDC_50 $USDC_300 $NOW $ENTRY_30D $TWO_MONTHS \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo "14/14: Lose 10%"
cast send $CONTRACT \
    "createGoal(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
    "Lose 10%" $PERCENT_10 $USDC_100 $USDC_500 $NOW $ENTRY_30D $THREE_MONTHS \
    --rpc-url $RPC --private-key $PRIVATE_KEY

echo ""
echo "=== Done! ==="
echo "Check goal count:"
echo "cast call $CONTRACT 'goalCount()' --rpc-url $RPC"
