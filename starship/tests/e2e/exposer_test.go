package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
	"net/http"
	urlpkg "net/url"

	pb "github.com/hyperweb-io/starship/exposer/exposer"
)

func (s *TestSuite) MakeExposerRequest(chain *Chain, req *http.Request, unmarshal proto.Message) {
	host := fmt.Sprintf("http://0.0.0.0:%d%s", chain.Ports.Exposer, req.URL.String())

	url, err := urlpkg.Parse(host)
	s.Require().NoError(err)

	req.URL = url

	body := s.MakeRequest(req, 200)
	err = jsonpb.Unmarshal(body, unmarshal)
	s.Require().NoError(err)
}

func (s *TestSuite) TestExposer_GetNodeID() {
	s.T().Log("running test for /node_id endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_id test since no exposer")
	}

	req, err := http.NewRequest(http.MethodGet, "/node_id", nil)
	s.Require().NoError(err)

	resp := &pb.ResponseNodeID{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotEmpty(resp.NodeId)
}

func (s *TestSuite) TestExposer_GetGenesisFile() {
	s.T().Log("running test for /genesis endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0{
		s.T().Skip("skipping /node_id test since no exposer")
	}
	if chain.Name == "solana" {
		s.T().Skip("skipping /genesis test since solana exposer is not supported")
	}

	req, err := http.NewRequest(http.MethodGet, "/genesis", nil)
	s.Require().NoError(err)

	// todo: fix unmarshalling of genesis into proto
	resp := &structpb.Struct{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().Equal(chain.ID, resp.AsMap()["chain_id"])
}

func (s *TestSuite) TestExposer_GetPubKey() {
	s.T().Log("running test for /pub_key endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_id test since no exposer")
	}
	if chain.Cometmock != nil && chain.Cometmock.Enabled {
		s.T().Skip("skipping tests for cometmock enabled chain")
	}
	if chain.Name == "solana" {
		s.T().Skip("skipping /genesis test since solana exposer is not supported")
	}

	req, err := http.NewRequest(http.MethodGet, "/pub_key", nil)
	s.Require().NoError(err)

	resp := &pb.ResponsePubKey{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().NotEmpty(resp.Key)
	s.Require().Equal("/cosmos.crypto.ed25519.PubKey", resp.Type)
}

func (s *TestSuite) TestExposer_GetPrivKey() {
	s.T().Log("running test for /priv_keys endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_id test since no exposer")
	}
	if chain.Name == "solana" {
		s.T().Skip("skipping /genesis test since solana exposer is not supported")
	}

	req, err := http.NewRequest(http.MethodGet, "/priv_keys", nil)
	s.Require().NoError(err)

	resp := &pb.PrivValidatorKey{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().NotEmpty(resp.PubKey)
	s.Require().NotEmpty(resp.Address)
}

func (s *TestSuite) TestExposer_GetPrivValState() {
	s.T().Log("running test for /priv_validator_state endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_id test since no exposer")
	}
	if chain.Name == "solana" {
		s.T().Skip("skipping /genesis test since solana exposer is not supported")
	}

	req, err := http.NewRequest(http.MethodGet, "/priv_validator_state", nil)
	s.Require().NoError(err)

	resp := &pb.PrivValidatorState{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().NotEmpty(resp.Height)
}

func (s *TestSuite) TestExposer_GetNodeKey() {
	s.T().Log("running test for /node_key endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_key test since no exposer")
	}

	req, err := http.NewRequest(http.MethodGet, "/node_key", nil)
	s.Require().NoError(err)

	resp := &pb.NodeKey{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().NotEmpty(resp.PrivKey)
}

func (s *TestSuite) TestExposer_GetKeys() {
	s.T().Log("running test for /keys endpoint for exposer")

	chain := s.config.Chains[0]
	if chain.Ports.Exposer == 0 {
		s.T().Skip("skipping /node_id test since no exposer")
	}
	if chain.Name == "solana" {
		s.T().Skip("skipping /genesis test since solana exposer is not supported")
	}

	req, err := http.NewRequest(http.MethodGet, "/keys", nil)
	s.Require().NoError(err)

	resp := &pb.Keys{}
	s.MakeExposerRequest(chain, req, resp)

	// assert results to expected values
	s.Require().NotNil(resp)
	s.Require().Len(resp.Genesis, 1)
	s.Require().Len(resp.Validators, 1)
	s.Require().Len(resp.Keys, 3)
	s.Require().Len(resp.Relayers, 5)
	s.Require().Len(resp.RelayersCli, 5)
}

func (s *TestSuite) TestExposer_CreateChannel() {
	s.T().Log("running test for /create_channel endpoint on the relayer")

	if s.config.Relayers == nil {
		s.T().Skip("skipping /create_channel test since no relayer")
	}

	for _, relayer := range s.config.Relayers {
		if relayer.Type != "hermes" || relayer.Ports.Exposer == 0 {
			continue
		}

		// get number of channels before creating channel
		ibcDataBefore := s.getIBCData(relayer.Chains[0], relayer.Chains[1])
		s.Require().GreaterOrEqual(len(ibcDataBefore.Channels), 1, ibcDataBefore)

		body := map[string]string{
			"a_chain":      relayer.Chains[0],
			"a_connection": ibcDataBefore.Chain_1.ConnectionId,
			"a_port":       "transfer",
			"b_port":       "transfer",
		}
		jsonBody, err := json.Marshal(body)
		s.Require().NoError(err)

		url := fmt.Sprintf("http://0.0.0.0:%d/create_channel", relayer.Ports.Exposer)
		req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonBody))
		s.Require().NoError(err)
		resp := s.MakeRequest(req, 200)

		var res map[string]interface{}
		err = json.NewDecoder(resp).Decode(&res)
		s.Require().NoError(err)

		s.Require().Contains(res["status"].(string), "SUCCESS Channel", "response from exposer creaste_channel", res)

		// get number of channels after creating channel
		ibcDataAfter := s.getIBCData(relayer.Chains[0], relayer.Chains[1])
		s.Require().Len(ibcDataAfter.Channels, len(ibcDataBefore.Channels)+1, "number of channels should be 1 more then before", ibcDataAfter)
	}
}
