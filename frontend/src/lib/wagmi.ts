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
    goalStake: '0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9' as `0x${string}`, // V3 - goal types (miles/steps)
    oracle: '0x70e8B14ea74ceEB62c2205bc9d4a9D76bAEc1aa6' as `0x${string}`, // AutomationV3 - passes goalType
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
    newUserChallenge: '0x28D2b6Eb9AF9F0c489a20a1Df6F24b37137A2E15' as `0x${string}`, // Deployed 2026-02-08
  },
  // Base (mainnet) - LIVE (deployed 2026-02-13)
  [base.id]: {
    goalStake: '0xAc67E863221B703CEE9B440a7beFe71EA8725434' as `0x${string}`, // VaadaV3 with Morpho yield
    oracle: '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D' as `0x${string}`, // AutomationV3
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
    newUserChallenge: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not deployed on mainnet yet
  },
}
