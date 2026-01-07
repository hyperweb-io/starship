package main

import (
	"context"
	"strconv"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	gov "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"
)

// TestChainUpgrade is the overall test for performing a software upgrade
func (s *TestSuite) TestChainUpgrade() {
	if testing.Short() {
		s.T().Skip("Skipping chain upgrade tests for short test")
	}

	chain, err := s.chainClients.GetChainClient("core-1")
	s.Require().NoError(err)
	keyName := "upgrade-test-address"
	address, err := chain.CreateRandWallet(keyName)
	s.Require().NoError(err)

	// Perform pre-upgrade steps
	// Transfer tokens to address
	s.T().Log("pre-upgrade: process running...")
	denom := chain.MustGetChainDenom()
	s.TransferTokens(chain, address, 12312300, denom)
	s.T().Logf("pre-upgrade: transfered %d%s tokens to addr: %s", 12312300, denom, address)

	// Perform chain upgrade
	// fetch all the information needed for the upgrade
	cc := chain.Config.GetChain("core-1")
	version := cc.Upgrade.Upgrades[0].Name
	curHeight, err := chain.GetHeight()
	s.Require().NoError(err)
	upgradeHeight := curHeight + 100

	s.T().Logf(
		"upgrade: starting upgrade test for version: %s, upgrade set for block: %d, current height: %d",
		version, upgradeHeight, curHeight)
	// Create software upgrade proposal
	plan := upgradetypes.Plan{
		Name:   version,
		Height: upgradeHeight,
		Info:   "",
	}
	content := upgradetypes.NewSoftwareUpgradeProposal(
		"Software upgrade",
		"software upgrade",
		plan,
	)

	msg := &gov.MsgSubmitProposal{
		InitialDeposit: sdk.NewCoins(sdk.NewCoin("uxprt", sdk.NewInt(10000000))),
		Proposer:       chain.Address,
	}
	err = msg.SetContent(content)
	s.Require().NoError(err)
	// Submit proposal
	s.T().Log("upgrade: submitting software upgrade prosal")
	res, err := chain.SendMsg(context.Background(), msg, "Software upgrade proposal")
	s.Require().NoError(err)
	s.WaitForTx(chain, res.TxHash)

	// Fetch the proposal id
	proposalID := 0
	for _, event := range res.Logs[0].Events {
		if event.Type == "submit_proposal" {
			for _, attr := range event.Attributes {
				if attr.Key == "proposal_id" {
					value, err := strconv.Atoi(attr.Value)
					s.Require().NoError(err)
					proposalID = value
				}
			}
		}
	}
	s.Require().NotZerof(proposalID, "proposal id not found in tx events")
	s.T().Logf("upgrade: software upgrade proposal submitted, proposal id: %d", proposalID)

	// Vote on the proposal to pass it
	vote := &gov.MsgVote{ProposalId: uint64(proposalID), Voter: chain.Address, Option: gov.OptionYes}
	res, err = chain.SendMsg(context.Background(), vote, "Votes for software upgrade proposal")
	s.Require().NoError(err)
	s.WaitForTx(chain, res.TxHash)
	s.T().Logf("upgrade: voted on the proposal from addr: %s", chain.Address)

	// Query proposal to see if it is in voting period
	req := &gov.QueryProposalRequest{ProposalId: uint64(proposalID)}
	queryclient := gov.NewQueryClient(chain.Client)
	propRes, err := queryclient.Proposal(context.Background(), req)
	s.Require().NoError(err)
	s.Require().NotNil(propRes)
	s.Require().Equal(propRes.Proposal.ProposalId, uint64(proposalID))
	s.Require().Equal(propRes.Proposal.Status, gov.StatusVotingPeriod)
	s.T().Logf("upgrade: queried the proposal which is in voting period")

	// Wait for upgrade height and fetch propsal again
	curHeight, err = chain.GetHeight()
	s.Require().NoError(err)
	s.T().Logf("upgrade: waiting for upgrade height: %d, current height: %d", upgradeHeight, curHeight)
	s.WaitForHeight(chain, upgradeHeight+1)

	propRes, err = queryclient.Proposal(context.Background(), req)
	s.Require().NoError(err)
	s.Require().NotNil(propRes)
	s.Require().Equal(propRes.Proposal.Status, gov.StatusPassed)
	s.T().Logf("post-upgrade: checked proposal has passed")

	// Verify upgrade happened
	upgradeClient := upgradetypes.NewQueryClient(chain.Client)
	planRes, err := upgradeClient.AppliedPlan(context.Background(), &upgradetypes.QueryAppliedPlanRequest{Name: version})
	s.Require().NoError(err)
	s.Require().Equal(planRes.Height, upgradeHeight)
	s.T().Logf("post-upgrade: checked proposal has been applied at upgrade height")

	// Perform post upgrade tests/checks
	// balance of address
	balance, err := chain.Client.QueryBalanceWithDenomTraces(context.Background(), sdk.MustAccAddressFromBech32(address), nil)
	s.Require().NoError(err)
	// Assert correct transfers
	s.Require().Len(balance, 1)
	s.Require().Equal(balance.Denoms(), []string{denom})
	s.Require().Equal(balance[0].Amount, sdk.NewInt(12312300))
	s.T().Logf("post-upgrade: verified balance of address after upgrade")

	// transfer some more tokens to address
	s.TransferTokens(chain, address, 12312300, denom)
	s.T().Logf(
		"post-upgrade: send more %d%s tokens to address: %s afte upgrade, creating 1st txn",
		12312300, denom, address)

	// Check balance again
	balance, err = chain.Client.QueryBalanceWithDenomTraces(context.Background(), sdk.MustAccAddressFromBech32(address), nil)
	s.Require().NoError(err)
	// Assert correct transfers
	s.Require().Len(balance, 1)
	s.Require().Equal(balance.Denoms(), []string{denom})
	s.Require().Equal(balance[0].Amount, sdk.NewInt(24624600))
	s.T().Logf("post-upgrade: verify that the address has double tokens")

	s.T().Log("Successful Chain Upgrade")
}
