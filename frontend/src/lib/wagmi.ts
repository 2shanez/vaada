import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'GoalStake',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

// Contract addresses (update after deployment)
export const CONTRACTS = {
  // Base Sepolia (testnet)
  [baseSepolia.id]: {
    goalStake: '0x36842e04C5b1CBD0cD0bdF4E44c27EB42EBF3eAC' as `0x${string}`,
    oracle: '0x8E69bf57b08992204317584b5e906c1B6e6E609E' as `0x${string}`,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
  },
  // Base (mainnet)
  [base.id]: {
    goalStake: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    oracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
  },
}
