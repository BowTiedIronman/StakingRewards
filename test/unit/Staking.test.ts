import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { network, deployments, ethers } from "hardhat"
import { developmentChains, rewardRate } from "../../helper-hardhat-config"
import { StakedToken, Staking, RewardToken } from "../../typechain-types"

describe("Stakin", () => {
  let staking: Staking
  let stakedToken: StakedToken
  let rewardToken: Staking
  let accounts: SignerWithAddress[]
  let deployer: SignerWithAddress
  let staker: SignerWithAddress
  let preMint: BigNumber
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
    await stakedToken.increaseAllowance(staking.address, preMint)
  })

  describe("initialFund", () => {
    it("reverts with NotAlreadyFunded", async () => {
      await expect(
        staking.stake(ethers.utils.parseUnits("200"))
      ).to.be.revertedWith("Staking_NotAlreadyFunded")
    })
    it("is funded", async () => {
      await staking.initialFund(preMint)
      expect(await staking.s_isFunded()).to.be.true
      expect((await staking.totalStaked()).toString()).to.be.equal(preMint)
    })
  })
  describe("stake", () => {
    let stakerBalance = ethers.utils.parseUnits("200")
    beforeEach(async () => {
      await staking.initialFund(preMint)
      const stakedByPreMint = await staking.totalStaked()
      await stakedToken
        .connect(staker)
        .mint({ value: ethers.utils.parseEther("2") })
      await stakedToken
        .connect(staker)
        .increaseAllowance(staking.address, await stakedToken.totalSupply())
      await staking.connect(staker).stake(stakerBalance)
    })

    it("emits Staked event", async () => {
      await stakedToken
        .connect(staker)
        .mint({ value: ethers.utils.parseEther("2") })
      await stakedToken
        .connect(staker)
        .increaseAllowance(staking.address, await stakedToken.totalSupply())
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
    it("calculates reward correctly", async () => {
      const interval = 10
      await network.provider.send("evm_increaseTime", [interval])
      await network.provider.request({ method: "evm_mine", params: [] })
      const totalStaked = await stakedToken.balanceOf(staking.address)
      const stakerReward = stakerBalance
        .mul(rewardRate)
        .mul(interval)
        .div(totalStaked)

      expect(await staking.getUserReward(staker.address)).to.be.equal(
        stakerReward
      )
    })
  })
  describe.skip("withdraw", () => {})
  describe.skip("claim reward", () => {})
})
