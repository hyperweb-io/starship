import { generateMnemonic } from '@confio/relayer/build/lib/helpers';
import { assertIsDeliverTxSuccess, SigningStargateClient } from '@cosmjs/stargate';
import { coin, coins } from '@cosmjs/amino';
import Long from 'long';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { osmosis, google } from 'osmojs';

import { calcShareOutAmount } from "./utils.js";
import { ChainClients } from './setup.test';

describe("Pool testing over IBC tokens", () => {
  let wallet;
  let baseDenom;
  let address;
  let chainClients;
  let chain;
  
  // Variables used across testcases
  let poolId;
  let pool;

  beforeAll(async () => {
    chainClients = ChainClients
    baseDenom = chainClients["osmosis-1"].getDenom();
    chain = chainClients["osmosis-1"];
    
    // Initialize wallet
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      generateMnemonic(),
      { prefix: chainClients["osmosis-1"].getPrefix() },
    );
    address = (await wallet.getAccounts())[0].address;
    
    // Transfer osmosis and ibc tokens to address, send only osmo to address
    await chain.sendTokens(address, "100000000000");
    await chainClients["cosmos-2"].sendIBCTokens(address, "100000000000", chain.getChainId());
  }, 200000);

  it("check address has tokens", async () => {
    const balances = await chain.client.getAllBalances(address);

    expect(balances.length).toEqual(2);
  }, 10000);

  it("create ibc pools with ibc atom osmo", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chain.rpc,
      wallet,
      chain.stargateClientOpts(),
    );
  
    const balances = await chain.client.getAllBalances(address);
  
    const msg = osmosis.gamm.poolmodels.balancer.v1beta1.MessageComposer.fromPartial.createBalancerPool({
      sender: address,
      poolParams: {
        swapFee: "1",
        exitFee: "0",
      },
      poolAssets: [
        {
          token: coin("10000000", balances[0].denom),
          weight: "100",
        },
        {
          token: coin("10000000", balances[1].denom),
          weight: "100",
        }
      ],
      futurePoolGovernor: "",
    });
  
    const result = await signingClient.signAndBroadcast(
      address,
      [msg],
      {amount: coins(10_000_000, chain.getDenom()), gas: "10000000"},
      "creating IBC pools",
    )
  
    assertIsDeliverTxSuccess(result);
  
    const poolCreated = result.events.find(x => x.type === "pool_created")
  
    // set poolid for the following test cases
    poolId = Long.fromString(poolCreated.attributes.find(x => x.key === "pool_id").value)
  
    expect(poolId.isPositive()).toBeTruthy()
  }, 200000);
  
  it("query pool via id, verify creation", async () => {
    // Query the created pool
    const queryClient = await osmosis.ClientFactory.createRPCQueryClient({
      rpcEndpoint: chain.rpc,
    });
    const poolResponse = await queryClient.osmosis.gamm.v1beta1.pool({poolId});
    
    expect(poolResponse).toBeTruthy()
    expect(poolResponse.pool.id.toInt()).toEqual(poolId.toInt())

    // Verify the address has gamm tokens
    const gammDenom = poolResponse.pool.totalShares.denom
    const gammBalance = await chain.client.getBalance(address, gammDenom);

    expect(gammBalance.denom).toEqual(gammDenom)
    expect(BigInt(gammBalance.amount)).toEqual(BigInt(poolResponse.pool.totalShares.amount))

    // Set pool var for other tests
    pool = poolResponse.pool
  }, 20000);

  it("join pool", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chain.rpc,
      wallet,
      chain.stargateClientOpts(),
    );

    const allCoins = pool.poolAssets.map(asset => coin("1000000", asset.token.denom))
    const shareOutAmount = calcShareOutAmount(pool, allCoins)
    const msg = osmosis.gamm.v1beta1.MessageComposer.withTypeUrl.joinPool({
      poolId: poolId,
      sender: address,
      shareOutAmount: shareOutAmount,
      tokenInMaxs: allCoins,
    })

    const result = await signingClient.signAndBroadcast(
      address,
      [msg],
      { amount: coins(10_000_000, chain.getDenom()), gas: "10000000" },
      "join pool created",
    )

    assertIsDeliverTxSuccess(result);

    // Verify new gamm tokens have been minted to the address
    const {denom: gammDenom, amount: totalgammAmount} = pool.totalShares
    const gammBalance = await chain.client.getBalance(address, gammDenom);
    
    expect(gammBalance.denom).toEqual(gammDenom)
    expect(BigInt(gammBalance.amount)).toEqual(BigInt(shareOutAmount) + BigInt(totalgammAmount))
  }, 200000);

  it("lock tokens", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chain.rpc,
      wallet,
      chain.stargateClientOpts(),
    );

    const gammDenom = pool.totalShares.denom
    const coins = [coin("1000000", gammDenom)]

    const msg = osmosis.lockup.MessageComposer.withTypeUrl.lockTokens({
      coins,
      owner: address,
      duration: google.protobuf.Duration.fromPartial({ seconds: "86400" , nanos: 0}),
    })

    const result = await signingClient.signAndBroadcast(
      address,
      [msg],
      { amount: [coin(10_000_000, chain.getDenom())], gas: "10000000" },
      "lock tokens",
    )

    assertIsDeliverTxSuccess(result);
  });
  
  it("swap tokens using pool, to address without ibc token", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chainClients["osmosis-1"].rpc,
      wallet,
      chainClients["osmosis-1"].stargateClientOpts(),
    );
    
    const ibcDenom = pool.poolAssets.find((asset) => {
      if (asset.token.denom.startsWith("ibc/")) {
        return asset
      }
    }).token.denom
    
    const balanceBefore = await chain.client.getBalance(address, ibcDenom)
    
    const msg = osmosis.gamm.v1beta1.MessageComposer.withTypeUrl.swapExactAmountIn({
      sender: address,
      routes: [
        {
          poolId,
          tokenOutDenom: ibcDenom,
        }
      ],
      tokenIn: coin("200000", chain.getDenom()),
      tokenOutMinAmount: "100000",
    })
  
    const result = await signingClient.signAndBroadcast(
      address,
      [msg],
      { amount: coins(10_000_000, chain.getDenom()), gas: "10000000" },
      "swap tokens",
    )
    
    assertIsDeliverTxSuccess(result);
    
    const swapEvent = result.events.find((event) => {
      if (event.type === "token_swapped" ) {
        return event
      }
    })
    const amountOut = swapEvent.attributes.find((attr) => {
      if (attr.key === "tokens_out") {
        return attr
      }
    }).value.split(ibcDenom)[0]
    
    const balanceAfter = await chain.client.getBalance(address, ibcDenom)
    
    // Verify balance increase of ibc denom is from token swap
    expect(BigInt(balanceAfter.amount) - BigInt(balanceBefore.amount)).toEqual(BigInt(amountOut))
  }, 200000);
});
