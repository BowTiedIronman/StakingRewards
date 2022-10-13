import hre from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { developmentChains, rewardRate } from "../../helper-hardhat-config"
import { StakedToken, Staking, RewardToken } from "../../typechain-types"
import { BigNumber, BigNumberish } from "ethers"

network.config.chainId !== 31337
  ? describe.skip
  : describe("Staking", () => {
      let staking: Staking
      let stakedToken: StakedToken
      let rewardToken: RewardToken
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress
      let staker: SignerWithAddress
      let preMint: BigNumber

      const increaseAllowance = async function (
        user: SignerWithAddress = staker,
        eth: number = 2
      ) {
        await stakedToken
          .connect(user)
          .mint({ value: ethers.utils.parseEther(eth.toString()) })
        const res = await stakedToken
          .connect(user)
          .increaseAllowance(
            staking.address,
            await stakedToken.balanceOf(user.address)
          )

        return await res.wait(1)
      }

      const stake = async function (
        user: SignerWithAddress = staker,
        amount: BigNumberish = 200
      ) {
        const res = await staking
          .connect(user)
          .stake(ethers.utils.parseUnits(amount.toString()))
        return res.wait(1)
      }

      beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        staker = accounts[1]
        await deployments.fixture(["all"])
        staking = await ethers.getContract("Staking")
        stakedToken = await ethers.getContract("StakedToken")
        rewardToken = await ethers.getContract("RewardToken")
        await staking.setRewardToken(
          "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
        )
        await staking.setStakingToken(
          "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        )
        await rewardToken.setStakingContract(
          "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
        )
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
          expect((await staking.s_totalStaked()).toString()).to.be.equal(
            preMint
          )
        })
      })
      describe("stake", () => {
        let stakerBalance = ethers.utils.parseUnits("200")
        beforeEach(async () => {
          await increaseAllowance(deployer)
          await staking.initialFund(preMint)
          await increaseAllowance()
          await stake()
        })

        it("emits Staked event", async () => {
          await increaseAllowance()
          await expect(
            staking.connect(staker).stake(ethers.utils.parseUnits("200"))
          ).to.emit(staking, "Staked")
        })
        it("transfers token to contract", async () => {
          expect(
            (await stakedToken.balanceOf(staking.address)).toString()
          ).to.be.equal("21000200000000000000000000")
        })
        it("adds tokens to vars", async () => {
          expect(await (await staking.s_totalStaked()).toString()).to.be.equal(
            "21000200000000000000000000"
          )
          expect(
            (await staking.s_TotalStakes(1)).amount.toString()
          ).to.be.equal("21000200000000000000000000")
        })
      })
      describe("stakerRewards", () => {
        beforeEach(async () => {
          await increaseAllowance(deployer)
          await staking.initialFund(preMint)
        })
        it("calculates correctly single stake", async () => {
          await increaseAllowance(accounts[1])

          const stakerOneAmount = ethers.utils.parseUnits("200")
          const stakerOneResponse = await staking
            .connect(accounts[1])
            .stake(stakerOneAmount)

          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })

          const stakerOneTimestamp = (
            await ethers.provider.getBlock(stakerOneResponse.blockHash!)
          ).timestamp

          const reward = await staking.stakerRewards(accounts[1].address)

          const latestBlock = await ethers.provider.getBlock("latest")

          const expectedReward = stakerOneAmount
            .mul(rewardRate)
            .mul(latestBlock.timestamp - stakerOneTimestamp)
            .div(preMint.add(stakerOneAmount))

          expect(reward.toString()).to.be.equal(expectedReward.toString())
        })
        it("calculates correctly multiple stakings", async () => {
          await increaseAllowance(accounts[1])
          await increaseAllowance(accounts[2], 3)
          const stakerOneAmount = ethers.utils.parseUnits("200")
          const stakerTwoAmount = ethers.utils.parseUnits("300")
          const stakerOneResponse = await staking
            .connect(accounts[1])
            .stake(stakerOneAmount)

          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })

          const stakerTwoResponse = await staking
            .connect(accounts[2])
            .stake(stakerTwoAmount)

          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })

          const stakerOneTimestamp = (
            await ethers.provider.getBlock(stakerOneResponse.blockHash!)
          ).timestamp
          const stakerTwoTimestamp = (
            await ethers.provider.getBlock(stakerTwoResponse.blockHash!)
          ).timestamp

          const reward = await staking.stakerRewards(accounts[1].address)
          /*
          ____----=====
          
          phase 1 : initial fund
          phase 2 : first staker
          phase 3 : 2nd staker
          */
          const latestBlock = await ethers.provider.getBlock("latest")
          const pahse1Staker1Reward = stakerOneAmount
            .mul(rewardRate)
            .mul(stakerTwoTimestamp - stakerOneTimestamp)
            .div(preMint.add(stakerOneAmount))

          const pahse2Staker1Reward = stakerOneAmount
            .mul(rewardRate)
            .mul(latestBlock.timestamp - stakerTwoTimestamp)
            .div(preMint.add(stakerOneAmount).add(stakerTwoAmount))

          const expectedReward = pahse1Staker1Reward.add(pahse2Staker1Reward)
          // console.log({
          //   address2: accounts[2].address,
          //   rewardRate,
          //   stakerOneTimestamp,
          //   stakerTwoTimestamp,
          //   latestBlock: latestBlock.timestamp,
          //   stakerOneAmount: stakerOneAmount.toString(),
          //   stakerTwoAmount: stakerTwoAmount.toString(),
          //   preMint: preMint.toString(),
          //   pahse1Staker1Reward: pahse1Staker1Reward.toString(),
          //   pahse2Staker1Reward: pahse2Staker1Reward.toString(),
          //   expectedReward: expectedReward.toString(),
          //   reward: reward.toString()
          // })
          expect(reward.toString()).to.be.equal(expectedReward.toString())
        })
      })
      describe("claim reward", () => {
        beforeEach(async () => {
          await increaseAllowance(deployer)
          await staking.initialFund(preMint)
          await increaseAllowance()
          await stake()
        })
        it("claims all reward", async () => {
          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })

          const txResponse = await staking.connect(staker).claimRewards()
          expect(
            (await rewardToken.balanceOf(staker.address)).toString()
          ).to.be.not.equal("0")
        })
        it("resets the timestamp reward correctly.", async () => {
          const txResponse = await staking.connect(staker).claimRewards()

          const stakerOneTimestamp = (
            await ethers.provider.getBlock(txResponse.blockHash!)
          ).timestamp

          const stakerHistoryTimestamp = (
            await staking.s_OwnerToStake(staker.address, 0)
          ).timestamp

          expect(stakerHistoryTimestamp.toString()).to.be.equal(
            stakerOneTimestamp.toString()
          )
        })
      })
      describe("withdraw", () => {
        beforeEach(async () => {
          await increaseAllowance(deployer)
          await staking.initialFund(preMint)
          await increaseAllowance()
          await stake()
        })
        it("should claim rewards", async () => {
          const txResponse = await staking.connect(staker).withdraw("0")
          const withdrawTimestamp = (
            await ethers.provider.getBlock(txResponse.blockHash!)
          ).timestamp
          const stakerHistoryTimestamp = (
            await staking.s_OwnerToStake(staker.address, 0)
          ).timestamp
          expect(stakerHistoryTimestamp.toString()).to.be.equal(
            withdrawTimestamp.toString()
          )
        })
        it("should withdraw partially", async () => {
          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })

          const txResponse = await staking
            .connect(staker)
            .withdraw(ethers.utils.parseUnits("100"))

          const amountLeft = await staking.s_OwnerToStake(staker.address, 0)
          expect(amountLeft[0].toString()).to.be.equal(
            ethers.utils.parseUnits("100").toString()
          )
        })
        it("should withdraw full amount", async () => {
          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })
          await increaseAllowance()
          await stake()
          const txResponse = await staking
            .connect(staker)
            .withdraw(ethers.utils.parseUnits("200"))

          const amountLeft = await staking.s_OwnerToStake(staker.address, 0)
          expect(amountLeft[0].toString()).to.be.equal("0".toString())
        })
        it("should withdraw only the amount the user has", async () => {
          const interval = 10
          await network.provider.send("evm_increaseTime", [interval])
          await network.provider.request({ method: "evm_mine", params: [] })
          await increaseAllowance()
          await stake()

          const stakingAmount0 = (
            await staking.s_OwnerToStake(staker.address, 0)
          ).amount.toString()
          const stakingAmount1 = (
            await staking.s_OwnerToStake(staker.address, 1)
          ).amount.toString()

          console.log({ stakingAmount0 })
          console.log({ stakingAmount1 })
          const txResponse = await staking
            .connect(staker)
            .withdraw(ethers.utils.parseUnits("500"))

          txResponse.wait(1)

          const balance = await stakedToken.balanceOf(staker.address)
          expect(balance.toString()).to.be.equal(
            "400000000000000000000".toString()
          )
        })
      })
    })
