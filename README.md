# Romeswap V2

[![Actions Status](https://github.com/Uniswap/uniswap-v2-core/workflows/CI/badge.svg)](https://github.com/Uniswap/uniswap-v2-core/actions)
[![Version](https://img.shields.io/npm/v/@uniswap/v2-core)](https://www.npmjs.com/package/@uniswap/v2-core)

In-depth documentation on Uniswap V2 is available at [uniswap.org](https://uniswap.org/docs).

The built artifacts can be browsed via [unpkg.com](https://unpkg.com/browse/@uniswap/v2-core@latest/).

# Local Development

The following assumes the use of `node@>=10`.

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`

## Via Docker

`docker build -t swap:latest .`

### For chain ID 1001

`docker run --network="local-env_net"  -e NETWORK='proxy' -e CHAIN_ID='1001'  swap:latest yarn test`

### For chain ID 1002

`docker run --network="local-env_net"  -e NETWORK='proxy2' -e CHAIN_ID='1002'  swap:latest yarn test`

## To Deploy Contracts for Cross Rollup Transactions 

### For chain ID 1001

`docker run --network="local-env_net" -e NETWORK='proxy' -e CHAIN_ID='1001' swap:latest yarn deploy:uniswapv2crossrollup`

### For chain ID 1002

`docker run --network="local-env_net" -e NETWORK='proxy2' -e CHAIN_ID='1002' swap:latest yarn deploy:uniswapv2crossrollup`