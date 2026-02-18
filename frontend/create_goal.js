const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

const GOALSTAKE = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
const RPC = 'https://base.publicnode.com';
const account = privateKeyToAccount(process.env.PRIVATE_KEY);

console.log('Wallet:', account.address);

const abi = parseAbi([
  'function createGoal(string name, uint8 goalType, uint256 target, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline) returns (uint256)',
  'function goalCount() view returns (uint256)',
]);

const pub = createPublicClient({ chain: base, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: base, transport: http(RPC) });

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const startTime = BigInt(now);
  const entryDeadline = BigInt(now + 15 * 60);  // 15 min entry window
  const deadline = BigInt(now + 30 * 60);        // 30 min total

  const minStake = BigInt(5e6);   // 5 USDC
  const maxStake = BigInt(10e6);  // 10 USDC

  console.log('Creating goal: 1K Steps E2E, Fitbit Steps, target=1000, 30min deadline');
  console.log('Entry window closes:', new Date((now + 15*60) * 1000).toISOString());
  console.log('Deadline:', new Date((now + 30*60) * 1000).toISOString());

  const hash = await wallet.writeContract({
    address: GOALSTAKE,
    abi,
    functionName: 'createGoal',
    args: ['1K Steps E2E', 1, BigInt(1000), minStake, maxStake, startTime, entryDeadline, deadline],
  });

  console.log('TX:', hash);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status);

  const count = await pub.readContract({ address: GOALSTAKE, abi, functionName: 'goalCount' });
  console.log('Goal ID:', Number(count) - 1);
}

main().catch(console.error);
