import hre from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { developmentChains, rewardRate } from "../../helper-hardhat-config"
import { StakedToken, Staking, RewardToken } from "../../typechain-types"
import { BigNumber } from "ethers"

describe("Stakin", () => {
  let staking: Staking
  let stakedToken: StakedToken
  let rewardToken: Staking
  let accounts: SignerWithAddress[]
  let deployer: SignerWithAddress
  let staker: SignerWithAddress
  let preMint: BigNumber

  const increaseAllowance = async function (user: SignerWithAddress = staker) {
    await stakedToken
      .connect(user)
      .mint({ value: ethers.utils.parseEther("2") })
    const res = await stakedToken
      .connect(user)
      .increaseAllowance(
        staking.address,
        await stakedToken.balanceOf(user.address)
      )

    return await res.wait(1)
  }

  const stake = async function () {
    const res = await staking
      .connect(staker)
      .stake(ethers.utils.parseUnits("200"))
    return res.wait(1)
  }

  beforeEach(async () => {
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    staker = accounts[1]
    await deployments.fixture(["all"])
    staking = await ethers.getContract("Staking")
    stakedToken = await ethers.getContract("StakedToken")
    await staking.setRewardToken("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")
    await staking.setStakingToken("0x5FbDB2315678afecb367f032d93F642f64180aa3")
    preMint = await stakedToken.balanceOf(deployer.address)
    await increaseAllowance(deployer)
  })

  describe("initialFund", () => {
    it("reverts with NotAlreadyFunded", async () => {
      await increaseAllowance()
      await expect(
        staking.stake(ethers.utils.parseUnits("200"))
      ).to.be.revertedWith("Staking_NotAlreadyFunded")
    })
    it("is funded", async () => {
      await increaseAllowance(deployer)
      await staking.initialFund(preMint)
      expect(await staking.s_isFunded()).to.be.true
      expect((await staking.totalStaked()).toString()).to.be.equal(preMint)
    })
  })
  describe("stake", () => {
    let stakerBalance = ethers.utils.parseUnits("200")
    beforeEach(async () => {
      await increaseAllowance(deployer)
      await staking.initialFund(preMint)
      const stakedByPreMint = await staking.totalStaked()
      await increaseAllowance()
      await stake()
    })

    it("emits Staked event", async () => {
      await increaseAllowance()
      await expect(staking.connect(staker).stake(stakerBalance)).to.emit(
        staking,
        `Staked`
      )
    })
    it("transfers token to contract", async () => {
      expect(await stakedToken.balanceOf(staking.address)).to.be.equal(
        preMint.add(stakerBalance)
      )
    })
    it("adds tokens to map", async () => {
      expect(
        (
          await staking.tokenToOwnerToStake(
            stakedToken.address,
            staker.address,
            0
          )
        )[0].toString()
      ).to.be.equal(stakerBalance)
    })
    it("calculates repeated staking reward correctly", async () => {
      const interval = 10
      await network.provider.send("evm_increaseTime", [interval])
      await network.provider.request({ method: "evm_mine", params: [] })
      await increaseAllowance()
      await stake()

      await network.provider.send("evm_increaseTime", [interval])
      await network.provider.request({ method: "evm_mine", params: [] })

      let currenBlockTimestamp = (await hre.ethers.provider.getBlock("latest"))
        .timestamp

      const totalStaked = await stakedToken.balanceOf(staking.address)
      const firstStake = await staking.tokenToOwnerToStake(
        stakedToken.address,
        staker.address,
        0
      )

      const firstStakeReward = firstStake.amount
        .mul(rewardRate)
        .mul(BigNumber.from(currenBlockTimestamp).sub(firstStake.timestamp))
        .div(totalStaked)

      const secondStake = await staking.tokenToOwnerToStake(
        stakedToken.address,
        staker.address,
        1
      )
      const secondStakeReward = secondStake.amount
        .mul(rewardRate)
        .mul(BigNumber.from(currenBlockTimestamp).sub(secondStake.timestamp))
        .div(totalStaked)

      expect(
        (await staking.getUserRewards(staker.address)).toString()
      ).to.be.equal([firstStakeReward, secondStakeReward].toString())
    })
  })
  describe("withdraw", () => {})
  describe("claim reward", () => {})
})
