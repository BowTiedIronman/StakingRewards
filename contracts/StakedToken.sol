// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice uncapped token that can be minted by anyone
 * at a price of 100 StakedToken per ETH.
 * @dev TODO : Premint permissionlessly add to Staking Contract instead of initialFund().
 */
contract StakedToken is ERC20 {
    uint256 public s_valuePerEth = 100;

    constructor(uint256 amountToMint) ERC20("StakedToken", "STK") {
        _mint(msg.sender, amountToMint * 10**18);
    }

    function mint() public payable {
        uint256 amountToMint = msg.value * s_valuePerEth;
        _mint(msg.sender, amountToMint);
    }
}
