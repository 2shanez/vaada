// Chainlink Functions source for RescueTime verification
// Checks if user stayed under target screen time for the goal period

const apiKey = args[0]
const startDate = args[1]
const endDate = args[2]
const targetHours = parseInt(args[3]) || 4

if (!apiKey || !startDate || !endDate) {
  throw new Error('Missing required arguments: apiKey, startDate, endDate')
}

// Call the Vaada verification API
const url = `https://vaada.io/api/rescuetime/verify?key=${apiKey}&start=${startDate}&end=${endDate}&target=${targetHours}`

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

// Return 1 for success (all days under target), 0 for failure
const result = data.success ? 1 : 0

return Functions.encodeUint256(result)
