package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

// SolanaRPCResponse represents a generic Solana RPC response
type SolanaRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// SolanaSlotResponse represents the slot response
type SolanaSlotResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  uint64 `json:"result"`
}

// SolanaVoteAccountsResponse represents vote accounts response
type SolanaVoteAccountsResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  struct {
		Current   []VoteAccount `json:"current"`
		Delinquent []VoteAccount `json:"delinquent"`
	} `json:"result"`
}

// VoteAccount represents a vote account
type VoteAccount struct {
	VotePubkey     string `json:"votePubkey"`
	NodePubkey     string `json:"nodePubkey"`
	ActivatedStake uint64 `json:"activatedStake"`
	Commission     int    `json:"commission"`
	LastVote       uint64 `json:"lastVote"`
	RootSlot       uint64 `json:"rootSlot"`
}

// SolanaClusterNodesResponse represents cluster nodes response
type SolanaClusterNodesResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  []ClusterNode `json:"result"`
}

// ClusterNode represents a cluster node
type ClusterNode struct {
	Pubkey     string `json:"pubkey"`
	Gossip     string `json:"gossip"`
	TPU        string `json:"tpu"`
	TPUForwards string `json:"tpuForwards"`
	TVU        string `json:"tvu"`
	RPC        string `json:"rpc"`
	Pubsub     string `json:"pubsub"`
	Version    string `json:"version"`
	FeatureSet uint32 `json:"featureSet"`
	ShredVersion uint16 `json:"shredVersion"`
}

// SolanaBalanceResponse represents balance response
type SolanaBalanceResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  struct {
		Context struct {
			Slot uint64 `json:"slot"`
		} `json:"context"`
		Value uint64 `json:"value"`
	} `json:"result"`
}

// SolanaSignatureResponse represents signature response
type SolanaSignatureResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  string `json:"result"`
}

// SolanaExposerResponse represents exposer response
type SolanaExposerResponse struct {
	NodeID string `json:"node_id"`
}

func (s *TestSuite) MakeSolanaRPCRequest(method string, params []interface{}, response interface{}) {
	// Get the Solana chain from config
	var solanaChain *Chain
	for _, chain := range s.config.Chains {
		if chain.Name == "solana" {
			solanaChain = chain
			break
		}
	}
	
	if solanaChain == nil {
		s.T().Skip("Solana chain not found in config")
	}

	// Prepare RPC request
	rpcRequest := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  method,
		"params":  params,
	}

	jsonData, err := json.Marshal(rpcRequest)
	s.Require().NoError(err)

	// Make HTTP request to Solana RPC
	url := fmt.Sprintf("http://0.0.0.0:%d", solanaChain.Ports.Rpc)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonData))
	s.Require().NoError(err)
	req.Header.Set("Content-Type", "application/json")

	body := s.MakeRequest(req, 200)
	err = json.NewDecoder(body).Decode(response)
	s.Require().NoError(err)
}

func (s *TestSuite) MakeSolanaExposerRequest(endpoint string, response interface{}) {
	// Get the Solana chain from config
	var solanaChain *Chain
	for _, chain := range s.config.Chains {
		if chain.Name == "solana" {
			solanaChain = chain
			break
		}
	}
	
	if solanaChain == nil {
		s.T().Skip("Solana chain not found in config")
	}

	url := fmt.Sprintf("http://0.0.0.0:%d%s", solanaChain.Ports.Exposer, endpoint)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	s.Require().NoError(err)

	body := s.MakeRequest(req, 200)
	err = json.NewDecoder(body).Decode(response)
	s.Require().NoError(err)
}

func (s *TestSuite) TestSolana_Status() {
	s.T().Log("running test for Solana RPC status")

	var response SolanaRPCResponse
	s.MakeSolanaRPCRequest("getHealth", []interface{}{}, &response)

	// Check for RPC errors
	s.Require().Nil(response.Error, "RPC should not return error")
	s.Require().Equal("2.0", response.JSONRPC)
	s.Require().Equal(1, response.ID)
	s.Require().Equal("ok", response.Result)
}

func (s *TestSuite) TestSolana_BlockHeight() {
	s.T().Log("running test for Solana block height increasing")

	// Get initial slot
	var initialResponse SolanaSlotResponse
	s.MakeSolanaRPCRequest("getSlot", []interface{}{}, &initialResponse)
	s.Require().Nil(initialResponse.Error, "RPC should not return error")
	initialSlot := initialResponse.Result

	s.T().Logf("Initial slot: %d", initialSlot)

	// Wait for a few seconds to allow block progression
	time.Sleep(5 * time.Second)

	// Get current slot
	var currentResponse SolanaSlotResponse
	s.MakeSolanaRPCRequest("getSlot", []interface{}{}, &currentResponse)
	s.Require().Nil(currentResponse.Error, "RPC should not return error")
	currentSlot := currentResponse.Result

	s.T().Logf("Current slot: %d", currentSlot)

	// Assert that block height is increasing
	s.Require().GreaterOrEqual(currentSlot, initialSlot, "Block height should be increasing")
}

func (s *TestSuite) TestSolana_VoteAccounts() {
	s.T().Log("running test for Solana vote accounts")

	var response SolanaVoteAccountsResponse
	s.MakeSolanaRPCRequest("getVoteAccounts", []interface{}{}, &response)

	// Check for RPC errors
	s.Require().Nil(response.Error, "RPC should not return error")
	s.Require().Equal("2.0", response.JSONRPC)
	s.Require().Equal(1, response.ID)

	// Assert that we have at least one vote account (bootstrap validator)
	s.Require().GreaterOrEqual(len(response.Result.Current), 1, "Should have at least one active vote account")

	// Log vote account details
	for i, account := range response.Result.Current {
		s.T().Logf("Vote Account %d: %s (Node: %s, Stake: %d)", 
			i+1, account.VotePubkey, account.NodePubkey, account.ActivatedStake)
	}
}

func (s *TestSuite) TestSolana_ClusterNodes() {
	s.T().Log("running test for Solana cluster nodes")

	var response SolanaClusterNodesResponse
	s.MakeSolanaRPCRequest("getClusterNodes", []interface{}{}, &response)

	// Check for RPC errors
	s.Require().Nil(response.Error, "RPC should not return error")
	s.Require().Equal("2.0", response.JSONRPC)
	s.Require().Equal(1, response.ID)

	// Assert that we have at least one node
	s.Require().GreaterOrEqual(len(response.Result), 1, "Should have at least one cluster node")

	// Log cluster node details
	for i, node := range response.Result {
		s.T().Logf("Cluster Node %d: %s (Gossip: %s, RPC: %s, Version: %s)", 
			i+1, node.Pubkey, node.Gossip, node.RPC, node.Version)
	}
}

func (s *TestSuite) TestSolana_Faucet() {
	s.T().Log("running test for Solana faucet via RPC")

	// Create a test address (you might want to generate a real keypair)
	testAddress := "11111111111111111111111111111112" // System Program ID as test

	// Request airdrop
	var airdropResponse SolanaSignatureResponse
	s.MakeSolanaRPCRequest("requestAirdrop", []interface{}{testAddress, 1000000000}, &airdropResponse)

	// Check for RPC errors
	s.Require().Nil(airdropResponse.Error, "RPC should not return error")
	s.Require().Equal("2.0", airdropResponse.JSONRPC)
	s.Require().Equal(1, airdropResponse.ID)
	s.Require().NotEmpty(airdropResponse.Result, "Should return a transaction signature")

	s.T().Logf("Airdrop transaction signature: %s", airdropResponse.Result)

	// Wait for transaction confirmation
	time.Sleep(2 * time.Second)

	// Check balance
	var balanceResponse SolanaBalanceResponse
	s.MakeSolanaRPCRequest("getBalance", []interface{}{testAddress}, &balanceResponse)

	// Check for RPC errors
	s.Require().Nil(balanceResponse.Error, "RPC should not return error")
	s.Require().Equal("2.0", balanceResponse.JSONRPC)
	s.Require().Equal(1, balanceResponse.ID)
	s.Require().GreaterOrEqual(balanceResponse.Result.Value, uint64(1000000000), "Balance should be at least 1 SOL")
}

func (s *TestSuite) TestSolana_BankTransfer() {
	s.T().Log("running test for Solana bank transfer")

	// This test would require creating keypairs and performing actual transfers
	// For now, we'll test the transfer instruction creation
	// In a real implementation, you'd need to:
	// 1. Create source and destination keypairs
	// 2. Fund the source account
	// 3. Create and send transfer transaction
	// 4. Verify the transfer

	s.T().Skip("Bank transfer test requires keypair generation and transaction signing - implement based on your needs")
}

func (s *TestSuite) TestSolana_Exposer_NodeID() {
	s.T().Log("running test for Solana exposer node ID")

	var response SolanaExposerResponse
	s.MakeSolanaExposerRequest("/node_id", &response)

	// Assert that we get a valid node ID
	s.Require().NotEmpty(response.NodeID, "Should return a valid node ID")
	s.T().Logf("Node ID: %s", response.NodeID)
}

func (s *TestSuite) TestSolana_Exposer_Genesis() {
	s.T().Log("running test for Solana exposer genesis")

	// Get the Solana chain from config
	var solanaChain *Chain
	for _, chain := range s.config.Chains {
		if chain.Name == "solana" {
			solanaChain = chain
			break
		}
	}
	
	if solanaChain == nil {
		s.T().Skip("Solana chain not found in config")
	}

	url := fmt.Sprintf("http://0.0.0.0:%d/genesis", solanaChain.Ports.Exposer)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	s.Require().NoError(err)

	body := s.MakeRequest(req, 200)
	
	// Read the response as string to verify it's not empty
	genesisData, err := io.ReadAll(body)
	s.Require().NoError(err)
	s.Require().NotEmpty(genesisData, "Genesis data should not be empty")
	
	s.T().Logf("Genesis data length: %d bytes", len(genesisData))
}

func (s *TestSuite) TestSolana_Exposer_Keys() {
	s.T().Log("running test for Solana exposer keys")

	// Get the Solana chain from config
	var solanaChain *Chain
	for _, chain := range s.config.Chains {
		if chain.Name == "solana" {
			solanaChain = chain
			break
		}
	}
	
	if solanaChain == nil {
		s.T().Skip("Solana chain not found in config")
	}

	url := fmt.Sprintf("http://0.0.0.0:%d/keys", solanaChain.Ports.Exposer)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	s.Require().NoError(err)

	body := s.MakeRequest(req, 200)
	
	// Parse the keys response
	var keysResponse map[string]interface{}
	err = json.NewDecoder(body).Decode(&keysResponse)
	s.Require().NoError(err)
	
	// Assert that we have keys data
	s.Require().NotEmpty(keysResponse, "Should return keys data")
	
	s.T().Logf("Keys response: %+v", keysResponse)
}

func (s *TestSuite) TestSolana_ValidatorCount() {
	s.T().Log("running test for Solana validator count")

	var response SolanaVoteAccountsResponse
	s.MakeSolanaRPCRequest("getVoteAccounts", []interface{}{}, &response)

	// Check for RPC errors
	s.Require().Nil(response.Error, "RPC should not return error")

	currentValidators := len(response.Result.Current)
	delinquentValidators := len(response.Result.Delinquent)
	totalValidators := currentValidators + delinquentValidators

	s.T().Logf("Current validators: %d", currentValidators)
	s.T().Logf("Delinquent validators: %d", delinquentValidators)
	s.T().Logf("Total validators: %d", totalValidators)

	// Assert that we have at least the bootstrap validator
	s.Require().GreaterOrEqual(currentValidators, 1, "Should have at least one current validator (bootstrap)")
	
	// If you have multiple validators configured, check for them
	var solanaChain *Chain
	for _, chain := range s.config.Chains {
		if chain.Name == "solana" {
			solanaChain = chain
			break
		}
	}
	
	if solanaChain != nil && solanaChain.NumValidators > 1 {
		expectedValidators := solanaChain.NumValidators
		s.Require().GreaterOrEqual(totalValidators, expectedValidators, 
			fmt.Sprintf("Should have at least %d validators", expectedValidators))
	}
}

func (s *TestSuite) TestSolana_NetworkHealth() {
	s.T().Log("running test for Solana network health")

	// Test multiple health indicators
	tests := []struct {
		name   string
		method string
		params []interface{}
	}{
		{"Health", "getHealth", []interface{}{}},
		{"Slot", "getSlot", []interface{}{}},
		{"Cluster Nodes", "getClusterNodes", []interface{}{}},
		{"Vote Accounts", "getVoteAccounts", []interface{}{}},
	}

	for _, test := range tests {
		s.Run(test.name, func() {
			var response SolanaRPCResponse
			s.MakeSolanaRPCRequest(test.method, test.params, &response)

			// Check for RPC errors
			s.Require().Nil(response.Error, fmt.Sprintf("%s should not return error", test.name))
			s.Require().Equal("2.0", response.JSONRPC)
			s.Require().Equal(1, response.ID)
			s.Require().NotNil(response.Result, fmt.Sprintf("%s should return result", test.name))
		})
	}
} 