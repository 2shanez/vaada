const { createWalletClient, createPublicClient, http } = require('viem');
const { mnemonicToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
const { readFileSync } = require('fs');

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const AUTOMATION = '0x8E69bf57b08992204317584b5e906c1B6e6E609E';

const mnemonic = process.argv[2] || process.env.MNEMONIC;
if (!mnemonic) {
  console.error('Usage: node deploy-v2.cjs "mnemonic here"');
  process.exit(1);
}

const account = mnemonicToAccount(mnemonic);
console.log('Deploying from:', account.address);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Read compiled artifact
const artifact = JSON.parse(
  readFileSync('/home/ubuntu/clawd/goalstake/contracts/out/GoalStakeV2.sol/GoalStakeV2.json', 'utf8')
);

async function main() {
  console.log('Deploying GoalStakeV2...');
  console.log('USDC:', USDC);
  console.log('Oracle:', AUTOMATION);

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: [USDC, AUTOMATION],
  });

  console.log('TX Hash:', hash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log('\n✅ GoalStakeV2 deployed!');
  console.log('Address:', receipt.contractAddress);
  console.log('Block:', receipt.blockNumber);
  console.log('Gas Used:', receipt.gasUsed.toString());
  
  console.log('\n=== Next Steps ===');
  console.log('1. Update automation: setGoalStake(' + receipt.contractAddress + ')');
  console.log('2. Update frontend CONTRACT_ADDRESS');
  console.log('3. Create initial goals via createGoal()');
}

main().catch(console.error);
