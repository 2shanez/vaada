// Chainlink Functions source for Fitbit verification
// Checks if user ran the target distance in the goal period

const accessToken = args[0]
const afterDate = args[1]  // YYYY-MM-DD format
const beforeDate = args[2] // YYYY-MM-DD format
const targetMiles = parseInt(args[3]) || 10

if (!accessToken || !afterDate || !beforeDate) {
  throw new Error('Missing required arguments: accessToken, afterDate, beforeDate')
}

// Call the Vaada verification API
const url = `https://vaada.io/api/fitbit/verify?token=${accessToken}&after=${afterDate}&before=${beforeDate}&target=${targetMiles}`

const response = await Functions.makeHttpRequest({
  url: url,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

if (response.error) {
  throw new Error('API request failed')
}

const data = response.data

// Return actual distance in micromiles (6 decimal places)
// This allows the contract to compare against the target
// e.g., 10.5 miles = 10500000 micromiles
const distanceMicromiles = data.distanceMicromiles || 0

return Functions.encodeUint256(distanceMicromiles)
