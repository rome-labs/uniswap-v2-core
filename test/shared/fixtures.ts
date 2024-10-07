import { Contract, Wallet, providers } from 'ethers'
const { JsonRpcProvider } = providers
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals, wait_for_tx_complete } from './utilities'

import ERC20 from '../../build/ERC20.json'
import UniswapV2Factory from '../../build/UniswapV2Factory.json'
import UniswapV2Pair from '../../build/UniswapV2Pair.json'

export const NETWORK = process.env.NETWORK ?? "";
console.log(`network:`, NETWORK);

export const RPC_URL = 
  NETWORK === "proxy" ? "http://proxy:9090" :
  NETWORK === "proxy2" ? "http://proxy2:9090" :
  NETWORK === "op-geth"  ? "http://geth:8545" :
  NETWORK === "op-geth2"  ? "http://geth2:8546" :
  NETWORK === "local-op-geth" ? "http://localhost:8545" : "";
console.log(`rpc_url:`, RPC_URL);

export const CHAIN_ID = Number(process.env.CHAIN_ID);
console.log(`chain id:`, CHAIN_ID);

interface FactoryFixture {
  factory: Contract
}

const overrides = {
  gasLimit: 1000000000
}

export async function factoryFixture(_: InstanceType<typeof JsonRpcProvider>, [wallet]: Wallet[]): Promise<FactoryFixture> {
  const factory = await deployContract(wallet, UniswapV2Factory, [wallet.address], overrides)
  return { factory }
}

interface PairFixture extends FactoryFixture {
  token0: Contract
  token1: Contract
  pair: Contract
}

export async function pairFixture(provider: InstanceType<typeof JsonRpcProvider>, [wallet]: Wallet[]): Promise<PairFixture> {
  const { factory } = await factoryFixture(provider, [wallet])
  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const balanceA =  await tokenA.balanceOf(wallet.address)
  const balanceB =  await tokenB.balanceOf(wallet.address)
  const tx = await factory.createPair(tokenA.address, tokenB.address, overrides)
  await wait_for_tx_complete(provider, tx.hash)

  const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
  const pair = new Contract(pairAddress, JSON.stringify(UniswapV2Pair.abi), provider).connect(wallet)

  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA
  return { factory, token0, token1, pair }
}
