// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

error Staking_TokenNotApproved();
error Staking_AlreadyFunded();
error Staking_NotAlreadyFunded();

contract Staking is Ownable {
    // initial fund
    // users stake tokens
    // users unstake tokens
    // reward users w/ tokens

    event Staked(address indexed sender, address indexed token, uint256 amount);

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    IERC20 public stakingToken;
    IRewardToken public rewardToken;

    bool public s_isFunded;
    // rate the entire staking pool earns RWD per second, including the initial fund.
    //  However the initial fund does can not withdraw its share of reward tokens, they are just used in the calculation.
    uint256 public s_rewardRate;
    mapping(address => Stake[]) public s_OwnerToStake;
    Stake[] public s_TotalStakes;
    uint256 public s_totalStaked;

    constructor(uint256 _rewardRate) {
        s_rewardRate = _rewardRate;
    }

    modifier fundOnlyOnce() {
        if (s_isFunded == true) revert Staking_AlreadyFunded();
        _;
    }

    modifier isFunded() {
        if (s_isFunded == false) revert Staking_NotAlreadyFunded();
        _;
    }

    function setStakingToken(address token) public onlyOwner {
        stakingToken = IERC20(token);
    }

    function setRewardToken(address token) public onlyOwner {
        rewardToken = IRewardToken(token);
    }

    function addToTotalStake(uint256 amount) internal {
        uint256 len = s_TotalStakes.length;
        if (len == 0) {
            s_TotalStakes.push(Stake(amount, block.timestamp));
        } else if (s_TotalStakes[len - 1].timestamp < block.timestamp) {
            s_TotalStakes.push(
                Stake(s_TotalStakes[len - 1].amount + amount, block.timestamp)
            );
        } else if (s_TotalStakes[len - 1].timestamp == block.timestamp) {
            s_TotalStakes[len - 1].amount += amount;
        }
    }

    function subtractFromTotalStake(uint256 amount) internal {
        uint256 len = s_TotalStakes.length;
        require(
            s_TotalStakes[len - 1].amount > amount,
            "amount staked less than amount withdrawn"
        );
        if (len == 0 || s_TotalStakes[len - 1].timestamp < block.timestamp) {
            s_TotalStakes.push(
                Stake(s_TotalStakes[len - 1].amount - amount, block.timestamp)
            );
        } else if (s_TotalStakes[len - 1].timestamp == block.timestamp) {
            s_TotalStakes[len - 1].amount -= amount;
        }
    }

    /** @dev the inner mapping of owner=>balance resets everytime we change
     * s_stakingTokenAddress on condition that tokenToOwnerToStake[s_stakingTokenAddress]
     * is always used to access that owner=>balance mapping
     */
    function setStakingTokenAddress(address token) public onlyOwner {
        stakingToken = IERC20(token);
        s_isFunded = false;
    }

    function setRewardRate(uint256 _rewardRate) public onlyOwner {
        s_rewardRate = _rewardRate;
    }

    function initialFund(uint256 amount) public onlyOwner fundOnlyOnce {
        // tokenToOwnerToStake[s_stakingToken][msg.sender].push(
        //     Stake(amount, block.timestamp)
        // ); should the owner earn rewards for the initial fund?
        s_isFunded = true;
        s_totalStaked += amount;
        addToTotalStake(amount);
        s_OwnerToStake[address(0)].push(Stake(amount, block.timestamp));
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function stake(uint256 amount) public isFunded {
        addToTotalStake(amount);
        stakingToken.transferFrom(msg.sender, address(this), amount);
        s_totalStaked += amount;
        s_OwnerToStake[msg.sender].push(Stake(amount, block.timestamp));
        emit Staked(msg.sender, address(stakingToken), amount);
    }

    function stakerRewards(address staker)
        public
        view
        returns (uint256[] memory)
    {
        Stake[] memory stakerHistory = s_OwnerToStake[staker];

        // console.log("s_rewardRate", s_rewardRate);
        // console.log("stakerOneTimestamp", stakerHistory[0].timestamp);
        // console.log(
        //     "staker2Timestamp",
        //     s_OwnerToStake[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC][0]
        //         .timestamp
        // );
        // console.log("block", block.timestamp);
        // console.log("stakerOneAmount", stakerHistory[0].amount);
        // console.log(
        //     "staker2 amount",
        //     s_OwnerToStake[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC][0].amount
        // );
        // console.log("total staked 0", s_TotalStakes[0].amount);
        // console.log("total staked 1", s_TotalStakes[1].amount);
        // console.log("total staked 2", s_TotalStakes[2].amount);

        uint256 stakerHistoryLen = stakerHistory.length;
        uint256[] memory rewards = new uint[](stakerHistoryLen);
        uint256 _reward;

        //TODO : should be optimized
        for (uint i = 0; i < stakerHistoryLen; i++) {
            uint256 stakerAmount = stakerHistory[i].amount;
            uint256 stakerTimestamp = stakerHistory[i].timestamp;
            uint256 stakesLen = s_TotalStakes.length;
            console.log("i", i, "stakerTimestamp", stakerTimestamp);

            for (uint j = 0; j < stakesLen; j++) {
                uint256 totalTimestamp = s_TotalStakes[j].timestamp;
                console.log("j", j, "totalTimestamp", totalTimestamp);
                if (
                    j + 1 < stakesLen &&
                    stakerTimestamp >= totalTimestamp &&
                    stakerTimestamp < s_TotalStakes[j + 1].timestamp
                ) {
                    _reward +=
                        (s_rewardRate *
                            stakerAmount *
                            (s_TotalStakes[j + 1].timestamp -
                                s_TotalStakes[j].timestamp)) /
                        s_TotalStakes[j].amount;
                } else if (j == stakesLen - 1) {
                    _reward +=
                        (s_rewardRate *
                            stakerAmount *
                            (block.timestamp - s_TotalStakes[j].timestamp)) /
                        s_TotalStakes[j].amount;
                }

                rewards[i] = _reward;
            }
        }
        return rewards;
    }

    // resets the staked timestamps to current timestamps and claims all rewards
    function claimRewards() public {
        uint256[] memory rewards = stakerRewards(msg.sender);

        uint256 len = rewards.length;
        uint256 amountValidated;
        for (uint i = 0; i < len; i++) {
            amountValidated += rewards[i];
            // reseting timestamp resets reward calculation in stakerRewards()
            s_OwnerToStake[msg.sender][i].timestamp = block.timestamp;
        }
        rewardToken.mint(msg.sender, amountValidated);
    }

    // should withdraw sender's stake starting from oldest & looping till amount is reached.
    function withdraw(uint256 amount) public {
        // claimRewards();
        // uint256 len = s_OwnerToStake[msg.sender].length;
        // uint256 validatedAmount;
        // for (uint i = 0; i < len; i++) {
        // }
    }
}

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}
