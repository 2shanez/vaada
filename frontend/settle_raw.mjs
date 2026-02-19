import { createPublicClient, http, encodeFunctionData, parseAbi, decodeFunctionResult } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v';
const account = privateKeyToAccount('0x10e9189b3f62eefa49db4276a294f248b67864a9720d57d3116a8d57a82a85e7');
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

async function main() {
  // Check goal 12 state first
  const goalAbi = parseAbi([
    'function goals(uint256) view returns (address creator, string description, uint256 stake, uint256 deadline, bool settled, bool successful)',
    'function settleGoal(uint256 goalId, address[] winners, address[] losers)',
    'function owner() view returns (address)',
    'function verifier() view returns (address)',
  ]);

  const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
  
  try {
    const goal = await publicClient.readContract({ address: vaadaV3, abi: goalAbi, functionName: 'goals', args: [12n] });
    console.log('Goal 12:', goal);
  } catch(e) { console.log('goals(12) error:', e.shortMessage); }

  try {
    const owner = await publicClient.readContract({ address: vaadaV3, abi: goalAbi, functionName: 'owner' });
    console.log('Owner:', owner);
  } catch(e) {}
  
  try {
    const verifier = await publicClient.readContract({ address: vaadaV3, abi: goalAbi, functionName: 'verifier' });
    console.log('Verifier:', verifier);
  } catch(e) { console.log('No verifier fn'); }

  console.log('Account:', account.address);

  // NUC V4
  const nucV4 = '0xB77e1FFa0be50E0B867c8f9CcdDBd1a88D354824';
  const nucAbi = parseAbi([
    'function adminSettle()',
    'function owner() view returns (address)',
    'function settled() view returns (bool)',
    'function deadline() view returns (uint256)',
  ]);

  try {
    const owner = await publicClient.readContract({ address: nucV4, abi: nucAbi, functionName: 'owner' });
    console.log('NUC owner:', owner);
  } catch(e) {}
  try {
    const settled = await publicClient.readContract({ address: nucV4, abi: nucAbi, functionName: 'settled' });
    console.log('NUC settled:', settled);
  } catch(e) { console.log('NUC no settled fn'); }
  try {
    const deadline = await publicClient.readContract({ address: nucV4, abi: nucAbi, functionName: 'deadline' });
    console.log('NUC deadline:', deadline, new Date(Number(deadline)*1000));
  } catch(e) { console.log('NUC no deadline fn'); }
}
main();
