package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/golang/protobuf/jsonpb"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"

	pb "github.com/hyperweb-io/starship/exposer/exposer"
)

var configEnvKey = "TEST_CONFIG_FILE"

type TestSuite struct {
	suite.Suite

	configFile string
	config     *Config
}

func TestE2ETestSuite(t *testing.T) {
	suite.Run(t, new(TestSuite))
}

func (s *TestSuite) SetupTest() {
	s.T().Log("setting up e2e integration test suite...")

	// read config file from yaml
	configFile := os.Getenv(configEnvKey)
	if configFile == "" {
		s.T().Log(fmt.Errorf("env var %s not set, using default value", configEnvKey))
		configFile = "configs/two-chain.yaml"
	}
	configFile = strings.Replace(configFile, "starship/", "", -1)
	configFile = strings.Replace(configFile, "tests/e2e/", "", -1)
	yamlFile, err := os.ReadFile(configFile)
	s.Require().NoError(err)
	config := &Config{}
	err = yaml.Unmarshal(yamlFile, config)
	s.Require().NoError(err)

	s.config = config
	s.configFile = configFile
}

func (s *TestSuite) MakeRequest(req *http.Request, expCode int) io.Reader {
	resp, err := http.DefaultClient.Do(req)
	s.Require().NoError(err, "trying to make request", zap.Any("request", req))

	s.Require().Equal(expCode, resp.StatusCode, "response code did not match")

	return resp.Body
}

func (s *TestSuite) TestChains_Status() {
	s.T().Log("running test for /status endpoint for each chain")

	for _, chain := range s.config.Chains {
		if chain.Name == "neutron" || chain.Name == "ethereum" || chain.Name == "solana" {
			s.T().Skip("skip tests for neutron")
		}
		url := fmt.Sprintf("http://0.0.0.0:%d/status", chain.Ports.Rpc)
		req, err := http.NewRequest(http.MethodGet, url, nil)
		s.Require().NoError(err)

		body := s.MakeRequest(req, 200)
		resp := &pb.Status{}
		err = jsonpb.Unmarshal(body, resp)
		s.Require().NoError(err)

		// assert chain id
		s.Require().Equal(chain.ID, resp.Result.NodeInfo.Network)
	}
}

func (s *TestSuite) TestChains_StakingParams() {
	if s.config.Chains[0].Ports.Rest == 0 {
		s.T().Skip("skip staking params test for non rest endpoint")
	}
	s.T().Log("running test for /staking/parameters endpoint for each chain")
	if s.config.Chains[0].Name == "neutron" || s.config.Chains[0].Name == "ethereum" || s.config.Chains[0].Name == "solana" {
		s.T().Skip("skip tests for neutron")
	}

	expUnbondingTime := "300s" // default value
	switch s.configFile {
	case "configs/one-chain.yaml":
		expUnbondingTime = "5s" // based on genesis override in one-chain.yaml file
	case "configs/one-chain-custom-scripts.yaml":
		expUnbondingTime = "15s" // based on genesis override in the custom script
	}

	url := fmt.Sprintf("http://0.0.0.0:%d/cosmos/staking/v1beta1/params", s.config.Chains[0].Ports.Rest)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	s.Require().NoError(err)
	body := s.MakeRequest(req, 200)
	data := map[string]interface{}{}

	err = json.NewDecoder(body).Decode(&data)
	s.Require().NoError(err)

	s.Require().Equal(expUnbondingTime, data["params"].(map[string]interface{})["unbonding_time"])
}

func (s *TestSuite) TestRelayers_State() {
	if s.config.Relayers == nil {
		s.T().Skip("No relayer found")
	}

	for _, relayer := range s.config.Relayers {
		if relayer.Type != "hermes" || relayer.Ports.Rest == 0 {
			continue
		}

		url := fmt.Sprintf("http://0.0.0.0:%d/state", relayer.Ports.Rest)
		req, err := http.NewRequest(http.MethodGet, url, nil)
		s.Require().NoError(err)
		body := s.MakeRequest(req, 200)
		data := map[string]interface{}{}

		err = json.NewDecoder(body).Decode(&data)
		s.Require().NoError(err)

		s.Require().Equal("success", data["status"].(string))
	}
}

func (s *TestSuite) TestChains_Balances() {
	if s.config.Chains[0].Ports.Rest == 0 {
		s.T().Skip("skip staking params test for non-rest endpoint")
	}
	s.T().Log("running test for /cosmos/bank/v1beta1/balances/{address} endpoint for each chain")
	if s.configFile != "configs/one-chain.yaml" {
		s.T().Skip("skip tests for checking custom balances")
	}

	for _, chain := range s.config.Chains {
		for _, balance := range chain.Balances {
			url := fmt.Sprintf("http://0.0.0.0:%d/cosmos/bank/v1beta1/balances/%s", chain.Ports.Rest, balance.Address)

			req, err := http.NewRequest(http.MethodGet, url, nil)
			s.Require().NoError(err)

			body := s.MakeRequest(req, 200)

			// Parse the response body
			data := map[string]interface{}{}
			err = json.NewDecoder(body).Decode(&data)
			s.Require().NoError(err)

			// Check for exactly one balance in the response
			balances, ok := data["balances"].([]interface{})
			s.Require().True(ok, "balances should be an array")
			s.Require().Len(balances, 1, "there should be exactly one balance")

			// Check that the amount and denom match the `coins` in the config
			balanceMap, ok := balances[0].(map[string]interface{})
			s.Require().True(ok, "balance should be a map")
			coins := fmt.Sprintf("%s%s", balanceMap["amount"], balanceMap["denom"])
			s.Require().Equal(balance.Amount, coins, "balance mismatch for address %s", balance.Address)
		}
	}
}

func (s *TestSuite) TestChainsEth_Block() {
	s.T().Log("Running test for eth_blockNumber endpoint")

	for _, chain := range s.config.Chains {
		if !strings.HasPrefix(chain.Name, "ethereum") {
			continue
		}

		url := fmt.Sprintf("http://0.0.0.0:%d", chain.Ports.Rest)
		s.T().Logf("Checking latest block number for chain: %s at %s", chain.Name, url)

		reqBody := `{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}`
		req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer([]byte(reqBody)))
		s.Require().NoError(err)
		req.Header.Set("Content-Type", "application/json")

		body := s.MakeRequest(req, 200)

		// Parse the response
		data := map[string]interface{}{}
		err = json.NewDecoder(body).Decode(&data)
		s.Require().NoError(err)

		// Extract block number from the result
		result, ok := data["result"].(string)
		s.Require().True(ok, "blockNumber result should be a string in hex format")

		// Convert hex to integer and validate it's non-zero
		blockNumber, err := strconv.ParseInt(result[2:], 16, 64)
		s.Require().NoError(err, "failed to parse block number")
		s.Require().Greater(blockNumber, int64(0), "block number should be greater than 0")

		s.T().Logf("Latest block number: %d", blockNumber)
	}
}

func (s *TestSuite) TestChainsEth_Balances() {
	s.T().Log("running test for eth_getBalance endpoint for each chain")

	for _, chain := range s.config.Chains {
		if chain.Name != "ethereum" {
			continue
		}

		if chain.Balances == nil {
			chain.Balances = []Balance{}
		}

		// add default balance to chain balances
		chain.Balances = append(chain.Balances, Balance{
			Address: "0x0000000000000000000000000000000000000001",
			Amount:  "0x3635c9adc5dea00000"})

		for _, balance := range chain.Balances {
			url := fmt.Sprintf("http://0.0.0.0:%d", chain.Ports.Rest)

			// Create the JSON-RPC request body
			requestBody, err := json.Marshal(map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "eth_getBalance",
				"params":  []interface{}{balance.Address, "latest"},
				"id":      1,
			})
			s.Require().NoError(err)

			req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(requestBody))
			s.Require().NoError(err)
			req.Header.Set("Content-Type", "application/json")

			body := s.MakeRequest(req, 200)

			// Parse the response body
			data := map[string]interface{}{}
			err = json.NewDecoder(body).Decode(&data)
			s.Require().NoError(err)

			// Extract the result field which contains the balance
			result, ok := data["result"].(string)
			s.Require().True(ok, "result should be a string")

			s.Require().Equal(balance.Amount, result, "balance mismatch for address %s", balance.Address)
		}
	}
}
