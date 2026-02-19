import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v';
const PRIVATE_KEY = '0x10e9189b3f62eefa49db4276a294f248b67864a9720d57d3116a8d57a82a85e7';
const account = privateKeyToAccount(PRIVATE_KEY);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: base, transport });
const walletClient = createWalletClient({ chain: base, transport, account });

const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
const nucV4 = '0xB77e1FFa0be50E0B867c8f9CcdDBd1a88D354824';

async function main() {
  // Try to simulate both to get revert reasons
  try {
    await publicClient.simulateContract({
      address: vaadaV3,
      abi: parseAbi(['function settleGoal(uint256 goalId, address[] winners, address[] losers)']),
      functionName: 'settleGoal',
      args: [12n, [], []],
      account: account.address,
    });
    console.log('VaadaV3 goal 12: simulation passed');
  } catch (e) {
    console.log('VaadaV3 goal 12 revert:', e.shortMessage || e.message);
  }

  try {
    await publicClient.simulateContract({
      address: nucV4,
      abi: parseAbi(['function adminSettle()']),
      functionName: 'adminSettle',
      args: [],
      account: account.address,
    });
    console.log('NUC V4: simulation passed');
  } catch (e) {
    console.log('NUC V4 revert:', e.shortMessage || e.message);
  }
}
main();
