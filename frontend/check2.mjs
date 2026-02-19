import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({ chain: base, transport: http('https://base-mainnet.g.alchemy.com/v2/V2EEs8WP3hd6yldPEx92v') });
const vaadaV3 = '0xAc67E863221B703CEE9B440a7beFe71EA8725434';
const abi = parseAbi([
  'function goalCount() view returns (uint256)',
  'function oracle() view returns (address)',
  'function getGoal(uint256) view returns (tuple(uint256 id, string name, uint256 target, uint256 minStake, uint256 maxStake, uint256 startTime, uint256 entryDeadline, uint256 deadline, bool active, bool settled, uint256 totalStaked, uint256 participantCount))',
  'function getGoalParticipants(uint256) view returns (address[])',
]);

async function main() {
  const [goalCount, oracle] = await Promise.all([
    publicClient.readContract({ address: vaadaV3, abi, functionName: 'goalCount' }),
    publicClient.readContract({ address: vaadaV3, abi, functionName: 'oracle' }),
  ]);
  console.log('goalCount:', goalCount.toString());
  console.log('oracle:', oracle);
  
  if (goalCount > 12n) {
    const goal = await publicClient.readContract({ address: vaadaV3, abi, functionName: 'getGoal', args: [12n] });
    console.log('Goal 12:', JSON.stringify(goal, (k,v) => typeof v === 'bigint' ? v.toString() : v));
    const participants = await publicClient.readContract({ address: vaadaV3, abi, functionName: 'getGoalParticipants', args: [12n] });
    console.log('Participants:', participants);
  } else {
    console.log('Goal 12 does not exist (goalCount is', goalCount.toString(), ')');
  }
}
main();
