import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import {
  networkConfig,
  developmentChains,
  amountToPreMint
} from "../helper-hardhat-config"

const deployStakedToken: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("-1--deploy-contract-Staked-Token------")
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number = network.config.chainId!

  // if (chainId == 31337) {
  // } else {
  // }

  const args: any = [amountToPreMint]

  log("----------------------------------------------------")
  log("Deploying and waiting for confirmations...")
  const StakedToken = await deploy("StakedToken", {
    from: deployer,
    args: args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 0
  })
  log(`StakedToken deployed at ${StakedToken.address}`)
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(StakedToken.address, args)
  }
}
export default deployStakedToken
deployStakedToken.tags = ["all", "stakedToken", "token"]
