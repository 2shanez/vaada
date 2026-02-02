const { createWalletClient, createPublicClient, http, parseUnits } = require('viem');
const { mnemonicToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const GOALSTAKE_V2 = '0x615f7165f0ae886319cc0dc2754fe85b14c51b53';

const GOALSTAKE_ABI = [
  {
    name: 'createGoal',
    type: 'function',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'targetMiles', type: 'uint256' },
      { name: 'minStake', type: 'uint256' },
      { name: 'maxStake', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'goalCount',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
];

const mnemonic = process.argv[2] || process.env.MNEMONIC;
if (!mnemonic) {
  console.error('Usage: node create-goals.cjs "mnemonic"');
  process.exit(1);
}

const account = mnemonicToAccount(mnemonic);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Goals to create
const now = Math.floor(Date.now() / 1000);
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const goals = [
  // Test Goals (short durations for testing)
  { name: 'Quick Test', targetMiles: 0.2, minStake: 1, maxStake: 10, durationSeconds: 2 * MINUTE },
  { name: '5-Min Test', targetMiles: 0.5, minStake: 1, maxStake: 10, durationSeconds: 5 * MINUTE },
  
  // Daily Goals
  { name: 'Daily Mile', targetMiles: 1, minStake: 5, maxStake: 50, durationSeconds: 1 * DAY },
  { name: 'Daily 3', targetMiles: 3, minStake: 5, maxStake: 50, durationSeconds: 1 * DAY },
  
  // Weekly Goals
  { name: 'Weekend Warrior', targetMiles: 10, minStake: 10, maxStake: 100, durationSeconds: 3 * DAY },
  { name: 'Weekly 15', targetMiles: 15, minStake: 10, maxStake: 100, durationSeconds: 7 * DAY },
  
  // Monthly Goals
  { name: 'February 50', targetMiles: 50, minStake: 20, maxStake: 200, durationSeconds: 28 * DAY },
  { name: 'Marathon Prep', targetMiles: 100, minStake: 20, maxStake: 200, durationSeconds: 30 * DAY },
];

async function main() {
  console.log('Creating goals from:', account.address);
  console.log('Contract:', GOALSTAKE_V2);
  console.log('---');

  const startingCount = await publicClient.readContract({
    address: GOALSTAKE_V2,
    abi: GOALSTAKE_ABI,
    functionName: 'goalCount',
  });
  console.log('Starting goal count:', startingCount.toString());

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    const startTime = BigInt(now);
    const deadline = BigInt(now + goal.durationSeconds);
    const targetMilesWei = parseUnits(goal.targetMiles.toString(), 18);
    const minStakeWei = parseUnits(goal.minStake.toString(), 6);
    const maxStakeWei = parseUnits(goal.maxStake.toString(), 6);

    console.log(`\nCreating goal ${Number(startingCount) + i}: "${goal.name}"`);
    console.log(`  Target: ${goal.targetMiles} miles`);
    console.log(`  Stakes: $${goal.minStake} - $${goal.maxStake}`);
    console.log(`  Duration: ${goal.durationSeconds / 60} mins`);

    const hash = await walletClient.writeContract({
      address: GOALSTAKE_V2,
      abi: GOALSTAKE_ABI,
      functionName: 'createGoal',
      args: [goal.name, targetMilesWei, minStakeWei, maxStakeWei, startTime, deadline],
    });

    console.log(`  TX: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  Status: ${receipt.status === 'success' ? '✅' : '❌'}`);
  }

  const finalCount = await publicClient.readContract({
    address: GOALSTAKE_V2,
    abi: GOALSTAKE_ABI,
    functionName: 'goalCount',
  });
  console.log('\n---');
  console.log('Final goal count:', finalCount.toString());
  console.log('\nGoal IDs created: 0 through', (Number(finalCount) - 1));
  
  console.log('\n=== Update BrowseGoals.tsx with these onChainIds ===');
  for (let i = 0; i < goals.length; i++) {
    console.log(`"${goals[i].name}": onChainId: ${Number(startingCount) + i}`);
  }
}

main().catch(console.error);
