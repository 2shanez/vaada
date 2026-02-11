// Chainlink Functions: Vaada Verifier v3
// Calls our backend API which handles Strava/Fitbit token refresh
//
// Arguments from smart contract:
// args[0] = User wallet address
// args[1] = Start timestamp (goal start)
// args[2] = End timestamp (goal deadline)
// args[3] = Goal type ("miles" or "steps")
// args[4] = API base URL (optional, defaults to vaada.io)

const userWallet = args[0];
const startTimestamp = args[1];
const endTimestamp = args[2];
const goalType = args[3] || "miles"; // Default to miles for backwards compatibility
const apiBaseUrl = args[4] || "https://vaada.io";

// Call our verify API endpoint
const apiResponse = await Functions.makeHttpRequest({
  url: `${apiBaseUrl}/api/verify`,
  params: {
    user: userWallet,
    start: startTimestamp,
    end: endTimestamp,
    type: goalType // "miles" or "steps"
  },
  timeout: 9000 // 9 second timeout
});

if (apiResponse.error) {
  // Return 0 miles on error (allows goal to settle as FAIL)
  return Functions.encodeUint256(BigInt(0));
}

const data = apiResponse.data;

if (data.error) {
  // API returned an error - return 0 miles
  return Functions.encodeUint256(BigInt(0));
}

// API returns milesWei as string (already scaled to 18 decimals)
const milesWei = BigInt(data.milesWei || "0");

return Functions.encodeUint256(milesWei);
