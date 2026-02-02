// Quick script to check automation contract state using raw JSON-RPC
const RPC = 'https://sepolia.base.org';
const AUTOMATION = '0x8E69bf57b08992204317584b5e906c1B6e6E609E';

async function call(to, data) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest']
    })
  });
  const json = await res.json();
  if (json.error) {
    console.error('RPC Error for', data + ':', json.error);
    return null;
  }
  return json.result;
}

async function main() {
  console.log('Checking GoalStakeAutomation contract...\n');
  
  // Correct selectors (computed via keccak256)
  // goalStake() - 0x838c016a
  const goalStakeResult = await call(AUTOMATION, '0x838c016a');
  const goalStake = goalStakeResult ? '0x' + goalStakeResult.slice(-40) : 'ERROR';
  
  // subscriptionId() - 0x09c1ba2e
  const subIdResult = await call(AUTOMATION, '0x09c1ba2e');
  const subId = subIdResult ? parseInt(subIdResult, 16) : 'ERROR';
  
  // functionsSource() - 0x1f822124
  const sourceResult = await call(AUTOMATION, '0x1f822124');
  // bytes return has offset/length header (64 bytes = 128 hex chars), then data
  const sourceLength = sourceResult ? Math.max(0, (sourceResult.length - 2 - 128) / 2) : 0;
  
  // owner() - 0x8da5cb5b  
  const ownerResult = await call(AUTOMATION, '0x8da5cb5b');
  const owner = ownerResult ? '0x' + ownerResult.slice(-40) : 'ERROR';
  
  console.log('=== Current State ===');
  console.log('GoalStake address:', goalStake);
  console.log('Subscription ID:', subId);
  console.log('Functions source:', sourceLength > 0 ? `✅ SET (${sourceLength} bytes)` : '❌ NOT SET');
  console.log('Owner:', owner);
  
  console.log('\n=== Expected ===');
  console.log('GoalStake: 0x36842e04C5b1CBD0cD0bdF4E44c27EB42EBF3eAC');
  console.log('Subscription ID: 561');
  
  console.log('\n=== Actions Needed ===');
  
  const expectedGoalStake = '0x36842e04C5b1CBD0cD0bdF4E44c27EB42EBF3eAC'.toLowerCase();
  
  if (goalStake.toLowerCase() !== expectedGoalStake) {
    console.log('❌ setGoalStake() - update to new address');
  } else {
    console.log('✅ GoalStake address correct');
  }
  
  if (subId !== 561) {
    console.log('❌ setSubscriptionId() - update to 561');
  } else {
    console.log('✅ Subscription ID correct');
  }
  
  if (sourceLength === 0) {
    console.log('❌ setFunctionsSource() - upload JS code');
  } else {
    console.log('✅ Functions source set');
  }
  
  console.log('\nAlso needed:');
  console.log('- Add automation contract as consumer to subscription 561');
  console.log('- Register upkeep at automation.chain.link');
}

main().catch(console.error);
