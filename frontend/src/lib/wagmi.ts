import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'

// Privy wagmi config
export const privyConfig = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
})

// Contract addresses (update after deployment)
export const CONTRACTS = {
  // Base Sepolia (testnet)
  [baseSepolia.id]: {
    goalStake: '0x13b8eaEb7F7927527CE1fe7A600f05e61736d217' as `0x${string}`, // V3 - entry windows
    oracle: '0xB10fCE97fc6eE84ff7772Bc44A651Dd076F7180D' as `0x${string}`, // AutomationV3
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
    newUserChallenge: '0x991000C16Ab118c51d1125FB2121D8Cb179a551D' as `0x${string}`,
  },
  // Base (mainnet)
  [base.id]: {
    goalStake: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    oracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
    newUserChallenge: '0x991000C16Ab118c51d1125FB2121D8Cb179a551D' as `0x${string}`,
  },
}
