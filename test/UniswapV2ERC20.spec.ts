import chai, { expect } from 'chai'
import { BigNumber, Contract, providers, Wallet, utils, constants } from 'ethers'

import { solidity, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, wait_for_tx_complete } from './shared/utilities'

import ERC20 from '../build/ERC20.json'
import { NETWORK, RPC_URL, CHAIN_ID } from './shared/fixtures'

const { hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } = utils;
const { MaxUint256 } = constants;

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('UniswapV2ERC20', () => { 
  const provider = new providers.JsonRpcProvider(RPC_URL, { name: NETWORK, chainId: CHAIN_ID })
  const wallet = new Wallet("0x97274c00fe8f93f3db107a4a10020d30b9b36f88021daff0e469967087178508", provider)
  const other = new Wallet("0xdbd8ab1077d8f1c7378d3f9255863b2674087153cd311185e97c743c2783f82c", provider)

  let token: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, ERC20, [TOTAL_SUPPLY])
  })

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const name = await token.name()
    expect(name).to.eq('Romeswap V2')
    expect(await token.symbol()).to.eq('RSWAP-V2')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            keccak256(
              toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            CHAIN_ID,
            token.address
          ]
        )
      )
    )
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
    )
  })

  it('approve', async () => {
      console.log(`Starting approval of ${TEST_AMOUNT.toString()} tokens for ${other.address} from ${wallet.address}`);
      const tx = await token.approve(other.address, TEST_AMOUNT);
      await wait_for_tx_complete(provider, tx.hash);
      await expect(tx)
          .to.emit(token, 'Approval')
          .withArgs(wallet.address, other.address, TEST_AMOUNT);
      
      const allowance = await token.allowance(wallet.address, other.address);
      expect(allowance).to.eq(TEST_AMOUNT);
  })


  it('transfer', async () => {
    const tx = await token.transfer(other.address, TEST_AMOUNT);
    await wait_for_tx_complete(provider, tx.hash);
    await expect(tx)
        .to.emit(token, 'Transfer')
        .withArgs(wallet.address, other.address, TEST_AMOUNT);
    const walletBalance = await token.balanceOf(wallet.address);
    const otherBalance = await token.balanceOf(other.address);
    expect(walletBalance).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT));
    expect(otherBalance).to.eq(TEST_AMOUNT);
})

  it('transfer:fail', async () => {
    await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(wallet.address, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    const tx = await token.approve(other.address, TEST_AMOUNT)
    await wait_for_tx_complete(provider, tx.hash)
    const tx1 = await token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT)
    await wait_for_tx_complete(provider, tx1.hash)
    await expect(tx1)
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    const tx = await token.approve(other.address, MaxUint256)
    await wait_for_tx_complete(provider, tx.hash)
    const tx1 = await token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT)
    await wait_for_tx_complete(provider, tx1.hash)
    await expect(tx1)
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(MaxUint256)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('permit', async () => {
    const nonce = await token.nonces(wallet.address)
    const deadline = MaxUint256
    const digest = await getApprovalDigest(
      token,
      { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
      nonce,
      deadline,
      CHAIN_ID
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    const tx = await token.permit(wallet.address, other.address, TEST_AMOUNT, deadline, v, hexlify(r), hexlify(s))
    await wait_for_tx_complete(provider, tx.hash)
    await expect(tx)
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
    expect(await token.nonces(wallet.address)).to.eq(BigNumber.from(1))
  })
})
