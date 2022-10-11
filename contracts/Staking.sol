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
    uint256 public rewardRate;
    mapping(IERC20 => mapping(address => Stake[])) public tokenToOwnerToStake;
    uint256 public totalStaked;

    constructor(uint256 _rewardRate) {
        rewardRate = _rewardRate;
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

    /** @dev the inner mapping of owner=>balance resets everytime we change
     * s_stakingTokenAddress on condition that tokenToOwnerToStake[s_stakingTokenAddress]
     * is always used to access that owner=>balance mapping
     */
    function setStakingTokenAddress(address token) public onlyOwner {
        stakingToken = IERC20(token);
        s_isFunded = false;
    }

    function setRewardRate(uint256 _rewardRate) public onlyOwner {
        rewardRate = _rewardRate;
    }

    function initialFund(uint256 amount) public onlyOwner fundOnlyOnce {
        // tokenToOwnerToStake[s_stakingToken][msg.sender].push(
        //     Stake(amount, block.timestamp)
        // ); should the owner earn rewards for the initial fund?
        s_isFunded = true;
        totalStaked += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function stake(uint256 amount) public isFunded {
        stakingToken.transferFrom(msg.sender, address(this), amount); // test that it reverts if no tokens in wallet
        totalStaked += amount;
        tokenToOwnerToStake[stakingToken][msg.sender].push(
            Stake(amount, block.timestamp)
        );
        emit Staked(msg.sender, address(stakingToken), amount);
    }

    function getUserRewards(address staker)
        public
        view
        returns (uint256[] memory)
    {
        Stake[] memory stakingHistory = tokenToOwnerToStake[stakingToken][
            staker
        ];

        uint256 blockt = block.timestamp;
        console.log("getter UserRewards at timestamp %s", blockt);
        uint256 len = stakingHistory.length;
        uint256[] memory rewards = new uint[](len);
        for (uint i = 0; i < len; i++) {
            uint256 stakedAmount = stakingHistory[i].amount;
            uint256 stakedTimestamp = stakingHistory[i].timestamp;
            uint256 _reward = ((block.timestamp - stakedTimestamp) *
                rewardRate *
                stakedAmount) / totalStaked;
            rewards[i] = _reward;
        }
        return rewards;
    }

    // resets the staked timestamps to current timestamps and claims all rewards
    function claimRewards(uint256 _amount) public {
        uint256[] memory rewards = getUserRewards(msg.sender);

        uint256 len = rewards.length;
        uint256 amountValidated;
        for (uint i = 0; i < len; i++) {
            uint256 blockt = block.timestamp;
            console.log("i %s at timestamp %s", i, blockt);
            // if reward slot greater than amount requested
            if (rewards[i] >= _amount) {
                console.log(
                    "reward %s greater than amount requested %s",
                    rewards[i],
                    _amount
                );
                rewards[i] -= _amount;
                amountValidated += _amount;
                uint256 timestampReconsiliation = (rewards[i] * totalStaked) /
                    (rewardRate *
                        tokenToOwnerToStake[stakingToken][msg.sender][i]
                            .amount);
                tokenToOwnerToStake[stakingToken][msg.sender][i].timestamp =
                    block.timestamp -
                    timestampReconsiliation;
                break;
                // if reward slot less than amount requested
            } else {
                console.log(
                    "reward %s less than amount requested %s",
                    rewards[i],
                    _amount
                );
                _amount -= rewards[i];
                amountValidated += rewards[i];
                rewards[i] = 0;
                tokenToOwnerToStake[stakingToken][msg.sender][i]
                    .timestamp = block.timestamp;
            }
        }
        console.log("valid rewards amount to mint %s", amountValidated);
        rewardToken.mint(msg.sender, amountValidated);
    }

    // should withdraw sender's stake starting from oldest & looping till amount is reached.
    function withdraw() public {}
}

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}
