// Chainlink Functions: Vaada Activity Verifier
// Handles both Strava (miles) and Fitbit (steps) via unified /api/verify
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

// Use unified /api/verify endpoint (handles both Strava miles + Fitbit steps)
const url = `${apiBaseUrl}/api/verify?user=${userAddress}&start=${startTimestamp}&end=${endTimestamp}&type=${goalType}`;

const response = await Functions.makeHttpRequest({
  url: url,
  method: "GET",
  headers: { "Accept": "application/json" }
});

if (response.error) {
  throw new Error(`API error: ${response.error}`);
}

const data = response.data;

if (!data.success) {
  throw new Error(`Verification failed: ${data.error || 'Unknown error'}`);
}

// Return value in wei (1e18 = 1 unit)
// API returns milesWei for both types (steps are scaled the same way)
const valueWei = BigInt(data.milesWei || "0");

return Functions.encodeUint256(valueWei);
