import { createPublicClient, http, parseAbi, decodeAbiParameters } from 'viem';
import { base } from 'viem/chains';

const RPC = 'https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';

async function main() {
  // Get raw goals(12) return data
  const data = await publicClient.call({
    to: vaadaV3,
    data: '0x5c2b2b0a000000000000000000000000000000000000000000000000000000000000000c', // goals(12)
  });
  console.log('Raw goals(12) data:', data.data);
  
  // Current block timestamp
  const block = await publicClient.getBlock();
  console.log('Block timestamp:', block.timestamp, new Date(Number(block.timestamp)*1000));
  
  // Try getGoal if exists
  try {
    const abi2 = parseAbi(['function getGoal(uint256) view returns (tuple(address,string,uint256,uint256,uint8,address[],address[]))']);
    const goal = await publicClient.readContract({ address: vaadaV3, abi: abi2, functionName: 'getGoal', args: [12n] });
    console.log('getGoal(12):', goal);
  } catch(e) { console.log('getGoal err:', e.shortMessage); }
  
  // Try goalCount
  try {
    const abi3 = parseAbi(['function goalCount() view returns (uint256)']);
    const count = await publicClient.readContract({ address: vaadaV3, abi: abi3, functionName: 'goalCount' });
    console.log('goalCount:', count);
  } catch(e) { console.log('goalCount err:', e.shortMessage); }

  // Try nextGoalId
  try {
    const abi3 = parseAbi(['function nextGoalId() view returns (uint256)']);
    const count = await publicClient.readContract({ address: vaadaV3, abi: abi3, functionName: 'nextGoalId' });
    console.log('nextGoalId:', count);
  } catch(e) { console.log('nextGoalId err:', e.shortMessage); }
}
main();
