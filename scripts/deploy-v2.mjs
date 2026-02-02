// Deploy GoalStakeV2 to Base Sepolia
import { createWalletClient, createPublicClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Config
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const AUTOMATION = '0x8E69bf57b08992204317584b5e906c1B6e6E609E';

async function main() {
  // Get mnemonic from env or argument
  const mnemonic = process.env.MNEMONIC || process.argv[2];
  if (!mnemonic) {
    console.error('Usage: MNEMONIC="..." node deploy-v2.mjs');
    console.error('   or: node deploy-v2.mjs "your mnemonic here"');
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

  // We need the compiled bytecode. For now, let's use forge to compile.
  console.log('\nCompiling contract...');
  try {
    execSync('cd /home/ubuntu/clawd/goalstake/contracts && forge build', { stdio: 'inherit' });
  } catch (e) {
    console.error('Forge not available, checking for pre-compiled artifacts...');
  }

  // Read the compiled artifact
  const artifactPath = '/home/ubuntu/clawd/goalstake/contracts/out/GoalStakeV2.sol/GoalStakeV2.json';
  let artifact;
  try {
    artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  } catch (e) {
    console.error('Could not read compiled artifact at:', artifactPath);
    console.error('Please compile the contract first with: cd contracts && forge build');
    process.exit(1);
  }

  const bytecode = artifact.bytecode.object;
  const abi = artifact.abi;

  console.log('\nDeploying GoalStakeV2...');
  console.log('USDC:', USDC);
  console.log('Oracle (Automation):', AUTOMATION);

  // Encode constructor args
  const { encodeAbiParameters } = await import('viem');
  const constructorArgs = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [USDC, AUTOMATION]
  );

  // Deploy
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [USDC, AUTOMATION],
  });

  console.log('Deploy TX:', hash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log('\n✅ GoalStakeV2 deployed!');
    console.log('Address:', receipt.contractAddress);
    console.log('Block:', receipt.blockNumber);
    
    console.log('\n--- Next Steps ---');
    console.log('1. Update automation contract: setGoalStake(' + receipt.contractAddress + ')');
    console.log('2. Update frontend contract address');
    console.log('3. Create initial goals');
  } else {
    console.error('❌ Deployment failed');
  }
}

main().catch(console.error);
