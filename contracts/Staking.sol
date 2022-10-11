// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    IERC20 public s_stakingToken;
    IERC20 public s_rewardToken;

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
        s_stakingToken = IERC20(token);
    }

    function setRewardToken(address token) public onlyOwner {
        s_rewardToken = IERC20(token);
    }

    /** @dev the inner mapping of owner=>balance resets everytime we change
     * s_stakingTokenAddress on condition that tokenToOwnerToStake[s_stakingTokenAddress]
     * is always used to access that owner=>balance mapping
     */
    function setStakingTokenAddress(address token) public onlyOwner {
        s_stakingToken = IERC20(token);
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
        s_stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function stake(uint256 amount) public isFunded {
        s_stakingToken.transferFrom(msg.sender, address(this), amount); // test that it reverts if no tokens in wallet
        totalStaked += amount;
        tokenToOwnerToStake[s_stakingToken][msg.sender].push(
            Stake(amount, block.timestamp)
        );
        emit Staked(msg.sender, address(s_stakingToken), amount);
    }

    function getUserReward(address user) public view returns (uint256) {
        Stake[] memory stakingHistory = tokenToOwnerToStake[s_stakingToken][
            user
        ];
        uint256 len = stakingHistory.length;
        uint256 totalReward;
        for (uint i = 0; i < len; i++) {
            uint256 stakedAmount = stakingHistory[i].amount;
            uint256 stakedTimestamp = stakingHistory[i].timestamp;
            uint256 _reward = ((block.timestamp - stakedTimestamp) *
                rewardRate *
                stakedAmount) / totalStaked;
            totalReward += _reward;
        }
        return totalReward;
    }

    // should withdraw sender's stake starting from oldest & looping till amount is reached.
    function withdraw(uint256 amount) public {}

    // resets the staked timestamps to current timestamps and claims all rewards
    function claimReward() public {}
}
