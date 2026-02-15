// NewUserChallenge Verification Source
// Checks if user has joined any goal on VaadaV3
// Returns "1" if they joined (won), "0" if not (lost)

const userAddress = args[0];
const goalStakeV3 = args[1];

// Call userGoals(address) to get array of goal IDs user joined
// Function selector for userGoals(address): 0x3d8f9b8c
const url = `https://mainnet.base.org`;

const response = await Functions.makeHttpRequest({
  url: url,
  method: "POST",
  headers: { "Content-Type": "application/json" },
  data: {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: goalStakeV3,
        data: `0x3d8f9b8c000000000000000000000000${userAddress.slice(2).toLowerCase()}`
      },
      "latest"
    ],
    id: 1
  }
});

if (response.error) {
  throw new Error(`RPC error: ${response.error.message}`);
}

const result = response.data.result;

// If result is not empty (user has joined at least one goal), return "1"
// Empty array returns 0x followed by offset (32 bytes) + length (0)
// Non-empty returns more data
if (result && result.length > 130) {
  // Has joined goals
  return Functions.encodeString("1");
} else {
  // No goals joined
  return Functions.encodeString("0");
}
