package main

import (
	"context"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/suite"
)

func TestE2ETestSuite(t *testing.T) {
	suite.Run(t, new(TestSuite))
}

func (s *TestSuite) TestChainsStatus() {
	s.T().Log("running test for /status endpoint for each chain")

	for _, chainClient := range s.chainClients {
		status, err := chainClient.GetStatus()
		s.Require().NoError(err)

		s.Require().Equal(chainClient.GetChainID(), status.NodeInfo.Network)
	}
}

func (s *TestSuite) TestChainTokenTransfer() {
	chain1, err := s.chainClients.GetChainClient("core-1")
	s.Require().NoError(err)

	keyName := "test-transfer"
	address, err := chain1.CreateRandWallet(keyName)
	s.Require().NoError(err)

	denom, err := chain1.GetChainDenom()
	s.Require().NoError(err)

	s.TransferTokens(chain1, address, 2345000, denom)

	// Verify the address received the token
	balance, err := chain1.Client.QueryBalanceWithDenomTraces(context.Background(), sdk.MustAccAddressFromBech32(address), nil)
	s.Require().NoError(err)

	// Assert correct transfers
	s.Require().Len(balance, 1)
	s.Require().Equal(balance.Denoms(), []string{denom})
	s.Require().Equal(balance[0].Amount, sdk.NewInt(2345000))
}

func (s *TestSuite) TestChainIBCTransfer() {
	s.T().Skip("Ibc transfer not working due to improper gas calculation")

	chain2, err := s.chainClients.GetChainClient("core-1")
	s.Require().NoError(err)
	chain1, err := s.chainClients.GetChainClient("osmosis-1")
	s.Require().NoError(err)

	keyName := "test-ibc-transfer"
	address, err := chain1.CreateRandWallet(keyName)
	s.Require().NoError(err)

	// Tranfer atom to persistence chain
	s.IBCTransferTokens(chain2, chain1, address, 12345000)

	// Verify the address received the token
	balance, err := chain1.Client.QueryBalanceWithDenomTraces(context.Background(), sdk.AccAddress(address), nil)
	s.Require().NoError(err)

	chain2Denom, err := chain2.GetChainDenom()
	s.Require().NoError(err)

	// Assert correct transfers
	s.Require().Len(balance, 1)
	s.Require().Equal(balance.Denoms(), []string{chain2Denom})
	s.Require().Equal(balance[0].Amount, sdk.NewInt(12345000))
}
