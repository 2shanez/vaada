import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'

// Privy wagmi config - Base mainnet only
export const privyConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  },
})

// Contract addresses - Base mainnet (deployed 2026-02-13)
export const CONTRACTS = {
  [base.id]: {
    goalStake: '0xd672c046f497bdDd27B01C42588f31db8758b6c7' as `0x${string}`, // VaadaV4 (10% platform fee)
    automation: '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D' as `0x${string}`, // AutomationV3
    oracle: '0xA6BcEcA41fCF743324a864F47dd03F0D3806341D' as `0x${string}`, // AutomationV3 (alias)
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
    morphoVault: '0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61' as `0x${string}`, // Gauntlet USDC Prime
    newUserChallenge: '0xE5e9eDE79B3c250B9922AA2CDfA02860e65cb14A' as `0x${string}`, // NewUserChallenge V4 (Safe-owned)
    vaadaReceipts: '0x4824c14bbd8F4506AD7dB455296D165442E13AF6' as `0x${string}`, // VaadaReceipts (Safe-owned)
  },
}
