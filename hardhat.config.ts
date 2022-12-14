import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"
import { HardhatUserConfig } from "hardhat/config"

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL ?? ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? ""
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY ?? ""
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ""

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17"
      }
    ]
  },
  networks: {
    goerli: { chainId: 5, url: GOERLI_RPC_URL, accounts: [PRIVATE_KEY] }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: []
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: COINMARKETCAP_API_KEY
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0
    }
  }
}
export default config
