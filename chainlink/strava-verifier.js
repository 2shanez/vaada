// Chainlink Functions: Strava Activity Verifier
// This runs on Chainlink's decentralized oracle network
// Fetches user's activity data from Strava and returns total miles

// Arguments passed from smart contract:
// args[0] = Strava access token (encrypted)
// args[1] = Start timestamp (challenge start)
// args[2] = End timestamp (challenge deadline)

const accessToken = args[0];
const startTimestamp = parseInt(args[1]);
const endTimestamp = parseInt(args[2]);

// Strava API: Get athlete activities
const stravaResponse = await Functions.makeHttpRequest({
  url: "https://www.strava.com/api/v3/athlete/activities",
  headers: {
    "Authorization": `Bearer ${accessToken}`
  },
  params: {
    after: startTimestamp,
    before: endTimestamp,
    per_page: 200 // Max activities to fetch
  }
});

if (stravaResponse.error) {
  throw new Error(`Strava API error: ${stravaResponse.error}`);
}

const activities = stravaResponse.data;

// Filter for running activities and sum distance
let totalMeters = 0;

for (const activity of activities) {
  // Only count runs (type = "Run")
  if (activity.type === "Run") {
    totalMeters += activity.distance; // Strava returns meters
  }
}

// Convert meters to miles (1 mile = 1609.34 meters)
const totalMiles = totalMeters / 1609.34;

// Return miles with 18 decimals (to match contract's ONE_MILE = 1e18)
// Multiply by 1e18 and return as uint256
const milesWei = Math.floor(totalMiles * 1e18);

// Return as bytes32 (Chainlink Functions returns bytes)
return Functions.encodeUint256(BigInt(milesWei));
