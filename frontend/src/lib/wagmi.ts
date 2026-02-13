import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'

// Privy wagmi config - Base mainnet only
export const privyConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
})

// Contract addresses - Base mainnet (deployed 2026-02-13)
export const CONTRACTS = {
  [base.id]: {
    goalStake: '0xAc67E863221B703CEE9B440a7beFe71EA8725434' as `0x${string}`, // VaadaV3 with Morpho yield
    oracle: '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D' as `0x${string}`, // AutomationV3
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
  },
}
