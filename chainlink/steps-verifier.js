// NewUserChallenge: 10k Steps Verification
// Calls /api/verify to check if user hit 10,000 steps in their 24h window
// Returns "1" if won (>=10k steps), "0" if lost

const userAddress = args[0];
const STEP_TARGET = 10000;
const CHALLENGE_DURATION = 24 * 60 * 60; // 24 hours in seconds

// NewUserChallenge contract on Base mainnet
const NEW_USER_CHALLENGE = "0x7a2959ff82aeF587A6B8491A1816bb4BA7aEE554";
const RPC_URL = "https://mainnet.base.org";

// Step 1: Get user's challenge deadline from contract
// challenges(address) returns (amount, deadline, settled, won)
const challengeSelector = "0x6370c0e1"; // keccak256("challenges(address)")[:4]
const userHex = userAddress.slice(2).toLowerCase().padStart(64, "0");

const rpcResponse = await Functions.makeHttpRequest({
  url: RPC_URL,
  method: "POST",
  headers: { "Content-Type": "application/json" },
  data: {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: NEW_USER_CHALLENGE,
        data: challengeSelector + userHex
      },
      "latest"
    ],
    id: 1
  }
});

if (rpcResponse.error) {
  throw new Error(`RPC error: ${rpcResponse.error.message}`);
}

// Parse deadline from response (second uint256, bytes 32-64)
const result = rpcResponse.data.result;
if (!result || result === "0x") {
  throw new Error("User has no challenge");
}

// Decode: skip 0x, then amount (64 chars), then deadline (64 chars)
const deadlineHex = result.slice(66, 130);
const deadline = parseInt(deadlineHex, 16);

if (deadline === 0) {
  throw new Error("No deadline found");
}

// Calculate time window: start = deadline - 24h, end = deadline
const endTimestamp = deadline;
const startTimestamp = deadline - CHALLENGE_DURATION;

// Step 2: Call /api/verify to get steps
const verifyUrl = `https://vaada.io/api/verify?user=${userAddress}&start=${startTimestamp}&end=${endTimestamp}&type=steps`;

const verifyResponse = await Functions.makeHttpRequest({
  url: verifyUrl,
  method: "GET",
  headers: { "Accept": "application/json" }
});

if (verifyResponse.error) {
  throw new Error(`Verify API error: ${verifyResponse.error.message}`);
}

const data = verifyResponse.data;

if (!data.success) {
  throw new Error(data.error || "Verification failed");
}

// Step 3: Check if steps >= target
const steps = data.steps || 0;

if (steps >= STEP_TARGET) {
  return Functions.encodeString("1"); // WIN
} else {
  return Functions.encodeString("0"); // LOSE
}
