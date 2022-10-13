# Staking Contract

WIP
TODO:
- Spec 5

## Overview 
### Specs : 
1. Owner can fund with an ERC20 reward token and define a total reward rate.
2. Users can stake an ERC20 staking token at any time.
3. Users receive rewards in the reward token, proportional to their *stake vs total staked*.
4. Users can withdraw at any time.
5. Upgradeable (T)

### Test Coverage : 
  12 passing (1s)

------------------|----------|----------|----------|----------|----------------|
File              |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------|----------|----------|----------|----------|----------------|
 contracts/       |    84.51 |    54.17 |    84.21 |    87.14 |                |
  RewardToken.sol |      100 |       50 |      100 |      100 |                |
  StakedToken.sol |      100 |      100 |      100 |      100 |                |
  Staking.sol     |    83.08 |    54.55 |    78.57 |    85.94 |... 81,90,91,95 |
------------------|----------|----------|----------|----------|----------------|
All files         |    84.51 |    54.17 |    84.21 |    87.14 |                |
------------------|----------|----------|----------|----------|----------------|
