import { createPublicClient, http, encodeFunctionData, parseAbi, hexToString } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v';
const account = privateKeyToAccount('0x10e9189b3f62eefa49db4276a294f248b67864a9720d57d3116a8d57a82a85e7');
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
const nucV4 = '0xB77e1FFa0be50E0B867c8f9CcdDBd1a88D354824';

async function main() {
  // Raw eth_call for settleGoal
  const settleData = encodeFunctionData({
    abi: parseAbi(['function settleGoal(uint256 goalId, address[] winners, address[] losers)']),
    functionName: 'settleGoal',
    args: [12n, [], []],
  });
  
  try {
    const result = await publicClient.call({ to: vaadaV3, data: settleData, account: account.address });
    console.log('VaadaV3 result:', result);
  } catch(e) {
    console.log('VaadaV3 revert data:', e.cause?.data || e.details || e.shortMessage || e.message);
    // Try to decode Error(string)
    if (e.cause?.data) {
      try {
        const data = e.cause.data;
        if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
          const msg = hexToString('0x' + data.slice(138), { size: 32 });
          console.log('Decoded revert:', msg.replace(/\0/g, ''));
        } else {
          console.log('Raw revert hex:', data);
        }
      } catch(e2) { console.log('decode err', e2.message); }
    }
  }

  // Raw eth_call for adminSettle
  const adminData = encodeFunctionData({
    abi: parseAbi(['function adminSettle()']),
    functionName: 'adminSettle',
  });
  
  try {
    const result = await publicClient.call({ to: nucV4, data: adminData, account: account.address });
    console.log('NUC result:', result);
  } catch(e) {
    console.log('NUC revert data:', e.cause?.data || e.details || e.shortMessage || e.message);
    if (e.cause?.data) {
      try {
        const data = e.cause.data;
        if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
          const msg = hexToString('0x' + data.slice(138), { size: 32 });
          console.log('Decoded NUC revert:', msg.replace(/\0/g, ''));
        } else {
          console.log('Raw NUC revert hex:', data);
        }
      } catch(e2) { console.log('decode err', e2.message); }
    }
  }
}
main();
