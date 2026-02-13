// Chainlink Functions: Vaada Activity Verifier
// Handles both Strava (miles) and Fitbit (steps)
//
// Arguments from smart contract (GoalStakeAutomationV3):
// args[0] = User wallet address
// args[1] = Start timestamp (goal start)
// args[2] = End timestamp (goal deadline)
// args[3] = Goal type ("miles" or "steps")
// args[4] = API base URL (e.g., "https://vaada.io")

const userAddress = args[0];
const startTimestamp = args[1];
const endTimestamp = args[2];
const goalType = args[3] || "miles";
const apiBaseUrl = args[4] || "https://vaada.io";

// Determine which API endpoint to call based on goal type
let endpoint;
if (goalType === "steps") {
  endpoint = `${apiBaseUrl}/api/fitbit/steps`;
} else {
  endpoint = `${apiBaseUrl}/api/verify`;
}

// Call verification API
const response = await Functions.makeHttpRequest({
  url: endpoint,
  params: {
    wallet: userAddress,
    user: userAddress,  // backward compat
    start: startTimestamp,
    end: endTimestamp,
    date: new Date(parseInt(endTimestamp) * 1000).toISOString().split('T')[0]  // for fitbit
  }
});

if (response.error) {
  throw new Error(`API error: ${response.error}`);
}

const data = response.data;

if (!data.success) {
  throw new Error(`Verification failed: ${data.error || 'Unknown error'}`);
}

// Return value in wei (1e18 = 1 unit)
// For miles: data.milesWei
// For steps: data.stepsWei or data.steps * 1e18
let valueWei;
if (goalType === "steps") {
  valueWei = BigInt(data.stepsWei || String(BigInt(data.steps || 0) * BigInt(1e18)));
} else {
  valueWei = BigInt(data.milesWei || "0");
}

return Functions.encodeUint256(valueWei);
