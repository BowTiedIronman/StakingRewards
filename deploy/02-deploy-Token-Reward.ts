import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import { networkConfig, developmentChains } from "../helper-hardhat-config"

const deployRewardToken: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("-2--deploy-contract-Reward-Token------")
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number = network.config.chainId!

  // if (chainId == 31337) {
  // } else {
  // }

  const args: any = []

  log("----------------------------------------------------")
  log("Deploying and waiting for confirmations...")
  const RewardToken = await deploy("RewardToken", {
    from: deployer,
    args: args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 0
  })
  log(`RewardToken deployed at ${RewardToken.address}`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(RewardToken.address, args)
  }
}
export default deployRewardToken
deployRewardToken.tags = ["all", "rewardToken", "token"]
