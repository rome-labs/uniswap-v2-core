import chai, { expect } from 'chai'
import { BigNumber, Contract, providers, Wallet, constants } from 'ethers'
const { AddressZero } = constants
import { solidity } from 'ethereum-waffle'

import { getCreate2Address, wait_for_tx_complete } from './shared/utilities'
import { factoryFixture, NETWORK, RPC_URL, CHAIN_ID } from './shared/fixtures'

import UniswapV2Pair from '../build/UniswapV2Pair.json'

chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]

describe('UniswapV2Factory', () => {
  const provider = new providers.JsonRpcProvider(RPC_URL, { name: NETWORK, chainId: CHAIN_ID })
  const wallet = new Wallet("0xd191daa598a77767eae21d33c865422f95a01f705bc4fbef8271d46177b075be", provider)
  const other = new Wallet("0xdbd8ab1077d8f1c7378d3f9255863b2674087153cd311185e97c743c2783f82c", provider)

  let factory: Contract
  beforeEach(async () => {
    // const fixture = await loadFixture(factoryFixture)
    const fixture = await factoryFixture(provider, [wallet])
    factory = fixture.factory
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero)
    expect(await factory.feeToSetter()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string]) {
    const bytecode = `0x${UniswapV2Pair.evm.bytecode.object}`
    const create2Address = getCreate2Address(factory.address, tokens, bytecode)
    const tx = await factory.createPair(...tokens)
    await wait_for_tx_complete(provider, tx.hash)
    await expect(tx)
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, BigNumber.from(1))

    await expect(factory.createPair(...tokens)).to.be.reverted // RomeswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // RomeswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(0)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(1)

    const pair = new Contract(create2Address, JSON.stringify(UniswapV2Pair.abi), provider)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
  })

  it('createPair:gas', async () => {
    const tx = await factory.createPair(...TEST_ADDRESSES)
    await wait_for_tx_complete(provider, tx.hash)
    // expect(receipt.gasUsed).to.eq(2512920)
  })

  it('setFeeTo', async () => {
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWith('RomeswapV2: FORBIDDEN')
    const tx = await factory.setFeeTo(wallet.address)
    await wait_for_tx_complete(provider, tx.hash)
    expect(await factory.feeTo()).to.eq(wallet.address)
  })

  it('setFeeToSetter', async () => {
    await expect(factory.connect(other).setFeeToSetter(other.address)).to.be.revertedWith('RomeswapV2: FORBIDDEN')
    const tx = await factory.setFeeToSetter(other.address)
    await wait_for_tx_complete(provider, tx.hash)
    expect(await factory.feeToSetter()).to.eq(other.address)
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith('RomeswapV2: FORBIDDEN')
  })
})
