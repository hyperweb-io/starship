import { generateMnemonic } from '@confio/relayer/build/lib/helpers';
import { assertIsDeliverTxSuccess, SigningStargateClient } from '@cosmjs/stargate';
import { coins } from '@cosmjs/amino';
import Long from 'long';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { cosmos } from "osmojs";

import { ChainClients } from './setup.test';
import { waitUntil } from "./utils.js";


describe("Governance tests for osmosis", () => {
  let wallet;
  let baseDenom;
  let address;
  let chainClients;
  let chain;
  
  // Variables used across testcases
  let queryClient;
  let proposalId;
  
  beforeAll(async () => {
    chainClients = ChainClients
    baseDenom = chainClients["osmosis-1"].getDenom();
    chain = chainClients["osmosis-1"];
    
    // Initialize wallet
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      generateMnemonic(),
      { prefix: chain.getPrefix() },
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
  
  it("submit a txt proposal", async () => {
    const signingClient = await SigningStargateClient.connectWithSigner(
      chain.rpc,
      wallet,
      chain.stargateClientOpts(),
    );
    
    const contentMsg = cosmos.gov.v1beta1.TextProposal.fromPartial({
      title: "Test Proposal",
      description: "Test text proposal for the e2e testing",
    });

    // Stake half of the tokens
    const msg = cosmos.gov.v1beta1.MessageComposer.withTypeUrl.submitProposal({
      proposer: address,
      initialDeposit: coins(1_000_000, baseDenom),
      content: {
        typeUrl: "/cosmos.gov.v1beta1.TextProposal",
        value: cosmos.gov.v1beta1.TextProposal.encode(contentMsg).finish(),
      },
    })
    
    const fee = {
      amount: coins(100_000, baseDenom),
      gas: "200000",
    };
    
    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);
    
    // Get proposal id from log events
    const proposalIdEvent = result.events.find((event) => event.type === "submit_proposal");
    proposalId = proposalIdEvent.attributes.find((attr) => attr.key === "proposal_id").value;
    
    expect(BigInt(proposalId)).toBeGreaterThan(BigInt(0));
  }, 200000);
  
  it("query proposal", async () => {
    const result = await queryClient.cosmos.gov.v1beta1.proposal({
      proposalId: Long.fromString(proposalId),
    });
    
    expect(result.proposal.proposalId.toString()).toEqual(proposalId);
  }, 10000);
  
  it("vote on proposal from genesis wallet", async () => {
    // Vote on proposal from genesis mnemonic address
    const msg = cosmos.gov.v1beta1.MessageComposer.withTypeUrl.vote({
      proposalId: Long.fromString(proposalId),
      voter: chain.address,
      option: cosmos.gov.v1beta1.VoteOption.VOTE_OPTION_YES,
    });
    
    const fee = {
      amount: coins(100_000, baseDenom),
      gas: "200000",
    }
    
    const result = await chain.client.signAndBroadcast(chain.address, [msg], fee);
    assertIsDeliverTxSuccess(result);
  }, 10000);
  
  it("verify vote", async () => {
    const { vote } = await queryClient.cosmos.gov.v1beta1.vote({
      proposalId: Long.fromString(proposalId),
      voter: chain.address,
    });
    
    expect(vote.proposalId.toString()).toEqual(proposalId);
    expect(vote.voter).toEqual(chain.address);
    expect(vote.option).toEqual(cosmos.gov.v1beta1.VoteOption.VOTE_OPTION_YES);
  }, 10000);
  
  it("wait for voting period to end", async () => {
    // wait for the voting period to end
    const {proposal} = await queryClient.cosmos.gov.v1beta1.proposal({
      proposalId: Long.fromString(proposalId),
    });
    
    await expect(waitUntil(proposal.votingEndTime)).resolves.not.toThrow();
  }, 200000);
  
  it("verify proposal passed", async () => {
    const { proposal } = await queryClient.cosmos.gov.v1beta1.proposal({
      proposalId: Long.fromString(proposalId),
    });
    
    expect(proposal.status).toEqual(cosmos.gov.v1beta1.ProposalStatus.PROPOSAL_STATUS_PASSED);
  }, 10000);
});
