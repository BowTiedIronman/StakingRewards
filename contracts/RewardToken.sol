// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

error RewardToken__NotAuthorized();

/** @notice staking reward token that can only be minted by the staking contract.
 */
contract RewardToken is ERC20, Ownable {
    address stakingContract;

    constructor() ERC20("RewardToken", "RWD") {}

    // only mint by the staking contract
    function mint(address to, uint256 amount) external {
        if (msg.sender != stakingContract) revert RewardToken__NotAuthorized();
        console.log("minting amount %s", amount);
        _mint(to, amount);
    }

    function setStakingContract(address _stakingContract) public onlyOwner {
        stakingContract = _stakingContract;
    }
}
