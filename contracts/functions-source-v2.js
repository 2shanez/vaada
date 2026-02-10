// Chainlink Functions: Vaada Verifier v2
// Calls our backend API which handles Strava token refresh
//
// Arguments from smart contract:
// args[0] = User wallet address
// args[1] = Start timestamp (goal start)
// args[2] = End timestamp (goal deadline)

const userWallet = args[0];
const startTimestamp = args[1];
const endTimestamp = args[2];

// Call our verify API endpoint
const apiResponse = await Functions.makeHttpRequest({
  url: `https://www.vaada.io/api/verify`,
  params: {
    user: userWallet,
    start: startTimestamp,
    end: endTimestamp
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

// API returns miles with 18 decimals
const milesWei = BigInt(data.miles || "0");

return Functions.encodeUint256(milesWei);
