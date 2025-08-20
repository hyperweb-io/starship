package e2e

import (
	"fmt"
	"io"
	"net/http"
	urlpkg "net/url"

	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"

	pb "github.com/hyperweb-io/starship/registry/registry"
)

func (s *TestSuite) MakeRegistryRequest(req *http.Request, unmarshal proto.Message) {
	host := fmt.Sprintf("http://0.0.0.0:%d%s", s.config.Registry.Ports.Rest, req.URL.String())

	url, err := urlpkg.Parse(host)
	s.Require().NoError(err)

	req.URL = url

	body := s.MakeRequest(req, 200)
	err = jsonpb.Unmarshal(body, unmarshal)
	//err = json.Unmarshal(body, unmarshal)
	s.Require().NoError(err)
}

func (s *TestSuite) TestRegistry_ListChainIds() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	s.T().Log("running test for /chain_ids endpoint for registry")

	req, err := http.NewRequest(http.MethodGet, "/chain_ids", nil)
	s.Require().NoError(err)

	respChains := &pb.ResponseChainIDs{}
	s.MakeRegistryRequest(req, respChains)

	// assert results to expected values
	s.Require().Len(respChains.ChainIds, len(s.config.Chains))
}

func (s *TestSuite) TestRegistry_ListChains() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains test since solana registry is not supported")
	}
	s.T().Log("running test for /chains endpoint for registry")

	req, err := http.NewRequest(http.MethodGet, "/chains", nil)
	s.Require().NoError(err)

	respChains := &pb.ResponseChains{}
	s.MakeRegistryRequest(req, respChains)

	// assert results to expected values
	s.Require().Len(respChains.Chains, len(s.config.Chains))
	for i := range respChains.Chains {
		chain := respChains.Chains[i]
		expChain := s.config.GetChain(chain.ChainId)
		s.Require().NotNil(expChain)

		if expChain.Name == "custom" {
			s.Require().Equal(expChain.ID, chain.ChainName)
		} else {
			s.Require().Equal(expChain.Name, chain.ChainName)
		}
	}
}

func (s *TestSuite) TestRegistry_GetChain() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains test since solana registry is not supported")
	}
	s.T().Log("running test for /chains/{chain} endpoint for registry")

	for _, chain := range s.config.Chains {
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s", chain.ID), nil)
		s.Require().NoError(err)

		respChain := &pb.ChainRegistry{}
		s.MakeRegistryRequest(req, respChain)

		s.Require().Equal(chain.ID, respChain.ChainId)
		if chain.Name == "custom" {
			s.Require().Equal(chain.ID, respChain.ChainName)
		} else {
			s.Require().Equal(chain.Name, respChain.ChainName)
		}
		if chain.Ports.Rpc != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Rpc), respChain.Apis.Rpc[0].Address)
		}
		if chain.Ports.Grpc != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Grpc), respChain.Apis.Grpc[0].Address)
		}
		if chain.Ports.Rest != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Rest), respChain.Apis.Rest[0].Address)
		}

		// chain specific assetertions
		if chain.Name == "osmosis" {
			s.Require().Equal("Osmosis Devnet", respChain.PrettyName)
		}
	}
}

func (s *TestSuite) TestRegistry_ListChainPeers() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains/{chain}/peers test since solana registry is not supported")
	}
	s.T().Log("running test for /chains/{chain}/peers endpoint for registry")

	for _, chain := range s.config.Chains {
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s/peers", chain.ID), nil)
		s.Require().NoError(err)

		respPeers := &pb.Peers{}
		s.MakeRegistryRequest(req, respPeers)

		s.Require().Len(respPeers.Seeds, 1)
		s.Require().Len(respPeers.PersistentPeers, chain.NumValidators-1)
	}
}

func (s *TestSuite) TestRegistry_ListChainApis() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains/{chain}/apis test since solana registry is not supported")
	}
	s.T().Log("running test for /chains/{chain}/apis endpoint for registry")

	for _, chain := range s.config.Chains {
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s/apis", chain.ID), nil)
		s.Require().NoError(err)

		respAPIs := &pb.APIs{}
		s.MakeRegistryRequest(req, respAPIs)

		s.Require().Len(respAPIs.Rpc, 1)
		if chain.Ports.Rpc != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Rpc), respAPIs.Rpc[0].Address)
		}
		s.Require().Len(respAPIs.Rest, 1)
		if chain.Ports.Rest != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Rest), respAPIs.Rest[0].Address)
		}
		s.Require().Len(respAPIs.Grpc, 1)
		if chain.Ports.Grpc != 0 {
			s.Require().Equal(fmt.Sprintf("http://localhost:%d", chain.Ports.Grpc), respAPIs.Grpc[0].Address)
		}
	}
}

func (s *TestSuite) TestRegistry_GetChainAssets() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains/{chain}/assets test since solana registry is not supported")
	}
	s.T().Log("running test for /chains/{chain}/assets endpoint for registry")

	expectedAssets := map[string]int{
		"osmosis": 2,
		"cosmos":  1,
		"agoric":  2,
	}

	for _, chain := range s.config.Chains {
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s/assets", chain.ID), nil)
		s.Require().NoError(err)

		respAssets := &pb.ResponseChainAssets{}
		s.MakeRegistryRequest(req, respAssets)

		chainName := chain.Name
		if chain.Name == "custom" {
			chainName = chain.ID
		}
		s.Require().Equal(chainName, respAssets.ChainName)

		expNumAssets := 1
		if n, ok := expectedAssets[chainName]; ok {
			expNumAssets = n
		}

		s.Require().Len(respAssets.Assets, expNumAssets)
	}
}

func (s *TestSuite) TestRegistry_GetChainAssets_Osmosis() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	s.T().Log("running test for /chains/{chain}/assets endpoint for osmosis chain registry")

	chain := s.config.GetChain("osmosis-1")
	if chain == nil {
		s.T().Skip("osmosis-1 chain not present in config, skipping")
	}

	expectedAssets := `{
	  "$schema": "../assetlist.schema.json",
	  "chain_name": "osmosis",
	  "assets": [
		{
		  "description": "The native token of Osmosis",
		  "denom_units": [
			{
			  "denom": "uosmo",
			  "exponent": 0,
			  "aliases": []
			},
			{
			  "denom": "osmo",
			  "exponent": 6,
			  "aliases": []
			}
		  ],
		  "base": "uosmo",
		  "name": "Osmosis",
		  "display": "osmo",
		  "symbol": "OSMO",
		  "coingecko_id": "osmosis",
		  "keywords": [
			"staking",
			"dex"
		  ],
		  "logo_URIs": {
			"png": "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png",
			"svg": "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg"
		  }
		},
		{
		  "description": "",
		  "denom_units": [
			{
			  "denom": "uion",
			  "exponent": 0,
			  "aliases": []
			},
			{
			  "denom": "ion",
			  "exponent": 6,
			  "aliases": []
			}
		  ],
		  "base": "uion",
		  "name": "Ion",
		  "display": "ion",
		  "symbol": "ION",
		  "coingecko_id": "ion",
		  "keywords": [
			"memecoin"
		  ],
		  "logo_URIs": {
			"png": "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/ion.png",
			"svg": "https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/ion.svg"
		  }
		}
	  ]
	}`

	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s/assets", chain.ID), nil)
	s.Require().NoError(err)
	host := fmt.Sprintf("http://0.0.0.0:%d/chains/%s/assets", s.config.Registry.Ports.Rest, chain.ID)
	url, err := urlpkg.Parse(host)
	s.Require().NoError(err)
	req.URL = url

	body := s.MakeRequest(req, 200)
	b, err := io.ReadAll(body)
	s.Require().NoError(err)

	s.Require().JSONEq(expectedAssets, string(b))

}

func (s *TestSuite) TestRegistry_ListIBC() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	s.T().Log("running test for /ibc endpoint for registry")
	if len(s.config.Relayers) == 0 {
		s.T().Skip("skip running ibc test for chains without relayers")
	}

	req, err := http.NewRequest(http.MethodGet, "/ibc", nil)
	s.Require().NoError(err)

	respIBC := &pb.ResponseListIBC{}
	s.MakeRegistryRequest(req, respIBC)

	// assert results to expected values
	expectedConnections := 0
	for _, relayer := range s.config.Relayers {
		if relayer.Type != "neutron-query-relayer" {
			expectedConnections += 2
		}
	}
	s.Require().GreaterOrEqual(len(respIBC.Data), expectedConnections, "number of ibc information should be double the number of relayers")
}

func (s *TestSuite) TestRegistry_GetChainKeys() {
	if s.config.Registry == nil || !s.config.Registry.Enabled {
		s.T().Skip("registry not enabled")
	}
	if s.config.Chains[0].Name == "solana" {
		s.T().Skip("skipping /chains/{chain}/keys test since solana registry is not supported")
	}
	s.T().Log("running test for /chains/{chain}/keys endpoint for registry")

	for _, chain := range s.config.Chains {
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("/chains/%s/keys", chain.ID), nil)
		s.Require().NoError(err)

		respKeys := &pb.Keys{}
		s.MakeRegistryRequest(req, respKeys)

		// assert results to expected values
		s.Require().Len(respKeys.Genesis, 1)
		s.Require().Len(respKeys.Validators, 1)
		s.Require().Len(respKeys.Keys, 3)
		s.Require().Len(respKeys.Relayers, 5)
		s.Require().Len(respKeys.RelayersCli, 5)
	}
}
