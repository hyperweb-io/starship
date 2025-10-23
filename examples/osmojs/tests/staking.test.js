import { generateMnemonic } from '@confio/relayer/build/lib/helpers';
import { assertIsDeliverTxSuccess, SigningStargateClient } from '@cosmjs/stargate';
import { coin, coins } from '@cosmjs/amino';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { cosmos } from "osmojs";
import BigNumber from 'bignumber.js';

import { ChainClients } from './setup.test';

describe("Staking tokens testing", () => {
  let wallet;
  let baseDenom;
  let address;
  let chainClients;
  let chain;
  
  // Variables used across testcases
  let queryClient;
  let validatorAddress;
  let delegationAmount;
  
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
    
    // Create custom cosmos interchain client
    queryClient = await cosmos.ClientFactory.createRPCQueryClient({rpcEndpoint: chain.rpc});
    
    // Transfer osmosis and ibc tokens to address, send only osmo to address
    await chain.sendTokens(address, "100000000000");
  }, 200000);
  
  it("check address has tokens", async () => {
    const { balance } = await queryClient.cosmos.bank.v1beta1.balance({
      address,
      denom: chain.getDenom(),
    });
    
    expect(balance.amount).toEqual("100000000000");
  }, 10000);
  
  it("query validator address", async () => {
    const { validators } = await queryClient.cosmos.staking.v1beta1.validators({
      status: cosmos.staking.v1beta1.bondStatusToJSON(
        cosmos.staking.v1beta1.BondStatus.BOND_STATUS_BONDED
      ),
    });
    let allValidators = validators
    if (validators.length > 1) {
      allValidators = validators.sort((a, b) =>
        new BigNumber(b.tokens).minus(new BigNumber(a.tokens)).toNumber()
      );
    }
    
    expect(allValidators.length).toBeGreaterThan(0);
    
    // set validator address to the first one
    validatorAddress = allValidators[0].operatorAddress;
  });
  
  it("stake tokens to genesis validator", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chain.rpc,
      wallet,
      chain.stargateClientOpts(),
    );
    
    const { balance } = await queryClient.cosmos.bank.v1beta1.balance({
      address,
      denom: chain.getDenom(),
    });
    
    // Stake half of the tokens
    delegationAmount = (BigInt(balance.amount) / BigInt(2)).toString()
    const msg = cosmos.staking.v1beta1.MessageComposer.fromPartial.delegate({
      delegatorAddress: address,
      validatorAddress: validatorAddress,
      amount: coin(delegationAmount, balance.denom),
    });
    
    const fee = {
      amount: coins(100000, balance.denom),
      gas: "200000",
    };
    
    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);
  });
  
  it("query delegation", async () => {
    const { delegationResponse } = await queryClient.cosmos.staking.v1beta1.delegation({
      delegatorAddr: address,
      validatorAddr: validatorAddress,
    });
    
    // Assert that the delegation amount is the set delegation amount
    expect(BigInt(delegationResponse.balance.amount)).toBeGreaterThan(BigInt(0));
    expect(delegationResponse.balance.amount).toEqual(delegationAmount);
    expect(delegationResponse.balance.denom).toEqual(baseDenom);
  });
});
