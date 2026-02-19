import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v';
const PRIVATE_KEY = '0x10e9189b3f62eefa49db4276a294f248b67864a9720d57d3116a8d57a82a85e7';

const account = privateKeyToAccount(PRIVATE_KEY);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: base, transport });
const walletClient = createWalletClient({ chain: base, transport, account });

// VaadaV3 - settleGoal(12, [], [])
const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
const vaadaAbi = parseAbi(['function settleGoal(uint256 goalId, address[] winners, address[] losers)']);

// NUC V4 - adminSettle()
const nucV4 = '0xB77e1FFa0be50E0B867c8f9CcdDBd1a88D354824';
const nucAbi = parseAbi(['function adminSettle()']);

async function main() {
  console.log('Settling VaadaV3 goal 12...');
  try {
    const hash1 = await walletClient.writeContract({
      address: vaadaV3,
      abi: vaadaAbi,
      functionName: 'settleGoal',
      args: [12n, [], []],
    });
    console.log('VaadaV3 goal 12 tx:', hash1);
    const r1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
    console.log('VaadaV3 goal 12 status:', r1.status);
  } catch (e) {
    console.error('VaadaV3 goal 12 error:', e.shortMessage || e.message);
  }

  console.log('Settling NUC V4...');
  try {
    const hash2 = await walletClient.writeContract({
      address: nucV4,
      abi: nucAbi,
      functionName: 'adminSettle',
      args: [],
    });
    console.log('NUC V4 tx:', hash2);
    const r2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
    console.log('NUC V4 status:', r2.status);
  } catch (e) {
    console.error('NUC V4 error:', e.shortMessage || e.message);
  }
}

main();
