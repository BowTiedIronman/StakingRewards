import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import {
  networkConfig,
  developmentChains,
  rewardRate
} from "../helper-hardhat-config"

const deployStaking: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("-3--deploy-contract-Staking-Contract-")
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number = network.config.chainId!

  // if (chainId == 31337) {
  // } else {
  // }

  const args: any = [rewardRate]

  log("----------------------------------------------------")
  log("Deploying and waiting for confirmations...")
  const Staking = await deploy("Staking", {
    from: deployer,
    args: args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 0
  })
  log(`Staking deployed at ${Staking.address}`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(Staking.address, args)
  }
}
export default deployStaking
deployStaking.tags = ["all", "Staking"]
