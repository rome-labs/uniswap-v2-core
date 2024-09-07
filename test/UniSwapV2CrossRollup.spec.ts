import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, providers, Wallet, utils, constants } from 'ethers'
import { pairFixture, NETWORK, RPC_URL, CHAIN_ID } from './shared/fixtures'
import { expandTo18Decimals, wait_for_tx_complete } from './shared/utilities'

chai.use(solidity)

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)
const { AddressZero } = constants
const overrides = {
gasLimit: 1000000000
}

describe('CrossRollupTestDeployer', () => {
    const provider = new providers.JsonRpcProvider(RPC_URL, { name: NETWORK, chainId: CHAIN_ID })
    const wallet = new Wallet("0x97274c00fe8f93f3db107a4a10020d30b9b36f88021daff0e469967087178508", provider)

    let factory: Contract
    let token0: Contract
    let token1: Contract
    let pair: Contract

    beforeEach(async () => {
      const fixture = await pairFixture(provider, [wallet])
      factory = fixture.factory
      token0 = fixture.token0
      token1 = fixture.token1
      pair = fixture.pair
    })

    const swapTestCase = [1, 5, 5, '1662497915624478906'].map(n =>
        typeof n === 'string' ? BigNumber.from(n) : expandTo18Decimals(n)
    );

    it('AddLiquidity', async () => {
        const token0Amount = expandTo18Decimals(1)
        const token1Amount = expandTo18Decimals(4)

        const tx1 = await token0.transfer(pair.address, token0Amount)
        await wait_for_tx_complete(provider, tx1.hash)
        const tx2 = await token1.transfer(pair.address, token1Amount)
        await wait_for_tx_complete(provider, tx2.hash)
    
        const expectedLiquidity = expandTo18Decimals(2)
        const tx3 = await pair.mint(wallet.address, overrides)
        await wait_for_tx_complete(provider, tx3.hash)
        await expect(tx3)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(pair, 'Sync')
          .withArgs(token0Amount, token1Amount)
          .to.emit(pair, 'Mint')
          .withArgs(wallet.address, token0Amount, token1Amount)
    
        expect(await pair.totalSupply()).to.eq(expectedLiquidity)
        expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        expect(await token0.balanceOf(pair.address)).to.eq(token0Amount)
        expect(await token1.balanceOf(pair.address)).to.eq(token1Amount)
        const reserves = await pair.getReserves()
        expect(reserves[0]).to.eq(token0Amount)
        expect(reserves[1]).to.eq(token1Amount)

        console.log(`Adding liquidity: Token0Amount = ${token0Amount}, Token1Amount = ${token1Amount}`);
        await addLiquidity(token0Amount, token1Amount);   
      })
    
    async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
        console.log(`Transferring Token0: ${token0Amount} and Token1: ${token1Amount} to the pair contract`);
        const tx1 = await token0.transfer(pair.address, token0Amount);
        const tx2 = await token1.transfer(pair.address, token1Amount);
        await wait_for_tx_complete(provider, tx1.hash);
        await wait_for_tx_complete(provider, tx2.hash);
        const tx3 = await pair.mint(wallet.address, overrides);        
        await wait_for_tx_complete(provider, tx3.hash);
    }
})
