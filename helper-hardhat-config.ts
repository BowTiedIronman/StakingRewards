export interface networkConfigItem {
  blockConfirmations?: number
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
  localhost: {},
  hardhat: {},
  goerli: { blockConfirmations: 1 }
}

export const developmentChains = ["hardhat", "localhost"]

export const amountToPreMint = 21000000

export const rewardRate = 10000000000
