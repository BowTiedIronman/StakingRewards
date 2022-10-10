// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** @notice uncapped token that can be minted by anyone
 * at a price of 100 StakedToken per ETH.
 */
contract StakingToken is ERC20 {
    uint256 public s_valueInEth = 100;

    constructor() ERC20("StakedToken", "STK") {}

    function mint() public payable {
        uint256 amountToMint = msg.value * s_valueInEth;
        _mint(msg.sender, amountToMint);
    }
}
