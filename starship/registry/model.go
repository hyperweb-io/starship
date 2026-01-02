package main

import (
	"sort"
	"strings"

	pb "github.com/hyperweb-io/starship/registry/registry"
)

type ChannelPort struct {
	ChannelId string `json:"channel_id"`
	PortId    string `json:"port_id"`
}

type ChannelsInfo struct {
	ChannelPort

	Counterparty ChannelPort
	ConnectionId string
	Ordering     string `json:"ordering,omitempty"`
	Version      string `json:"version,omitempty"`
	State        string `json:"state,omitempty"`
}

type ConnectionClient struct {
	ClientId     string
	ConnectionId string
}

type ConnectionInfo struct {
	ConnectionClient

	Counterparty ConnectionClient
}

type IBCInfo struct {
	ChainId      string `json:"chain_id"`
	ChainName    string `json:"chain_name"`
	ChannelId    string `json:"channel_id"`
	PortId       string `json:"port_id"`
	ConnectionId string `json:"connection_id"`
	ClientId     string `json:"client_id"`
}

type ChainIBCInfos []*ChainIBCInfo

func (infos ChainIBCInfos) ToProto() []*pb.IBCData {
	chainsIBCData := map[string]*pb.IBCData{}
	for _, ibcInfo := range infos {
		chain1 := &pb.IBCChain{
			ChainName:    ibcInfo.ChainName,
			ClientId:     ibcInfo.ClientId,
			ConnectionId: ibcInfo.ConnectionId,
		}
		chain2 := &pb.IBCChain{
			ChainName:    ibcInfo.Counterparty.ChainName,
			ClientId:     ibcInfo.Counterparty.ClientId,
			ConnectionId: ibcInfo.Counterparty.ConnectionId,
		}
		keys := []string{chain1.String(), chain2.String()}
		sort.Strings(keys)
		keyMap := strings.Join(keys, "--")
		_, ok := chainsIBCData[keyMap]

		if !ok {
			chainsIBCData[keyMap] = ibcInfo.ToProto()
			continue
		}

		// append channel to IBCData
		channel := &pb.ChannelData{
			Chain_1: &pb.ChannelData_ChannelPort{
				ChannelId: ibcInfo.ChannelId,
				PortId:    ibcInfo.PortId,
			},
			Chain_2: &pb.ChannelData_ChannelPort{
				ChannelId: ibcInfo.Counterparty.ChannelId,
				PortId:    ibcInfo.Counterparty.PortId,
			},
			Ordering: ibcInfo.Ordering,
			Version:  ibcInfo.Version,
			Tags: &pb.ChannelData_Tags{
				// todo: fetch status from client status instead of hardcoding
				Status:    "live",
				Preferred: true,
			},
		}

		chainsIBCData[keyMap].Channels = append(chainsIBCData[keyMap].Channels, channel)
	}

	values := []*pb.IBCData{}

	for _, value := range chainsIBCData {
		values = append(values, value)
	}

	return values
}

type ChainIBCInfo struct {
	IBCInfo

	Counterparty IBCInfo           `json:"counterparty,omitempty"`
	Ordering     string            `json:"ordering,omitempty"`
	Version      string            `json:"version,omitempty"`
	State        string            `json:"state,omitempty"`
	Tags         map[string]string `json:"tags,omitempty"`
}

func (info *ChainIBCInfo) ToProto() *pb.IBCData {
	return &pb.IBCData{
		Schema: "../ibc_data.schema.json",
		Chain_1: &pb.IBCChain{
			ChainName:    info.ChainName,
			ClientId:     info.ClientId,
			ConnectionId: info.ConnectionId,
		},
		Chain_2: &pb.IBCChain{
			ChainName:    info.Counterparty.ChainName,
			ClientId:     info.Counterparty.ClientId,
			ConnectionId: info.Counterparty.ConnectionId,
		},
		Channels: []*pb.ChannelData{
			&pb.ChannelData{
				Chain_1: &pb.ChannelData_ChannelPort{
					ChannelId: info.ChannelId,
					PortId:    info.PortId,
				},
				Chain_2: &pb.ChannelData_ChannelPort{
					ChannelId: info.Counterparty.ChannelId,
					PortId:    info.Counterparty.PortId,
				},
				Ordering: info.Ordering,
				Version:  info.Version,
				Tags: &pb.ChannelData_Tags{
					// todo: fetch status from client status instead of hardcoding
					Status:    "live",
					Preferred: true,
				},
			},
		},
	}
}

// GetCounterpartyChainInfo returns ChainIBCInfo struct for given counterparty
// chain id.
func (infos ChainIBCInfos) GetCounterpartyChainInfo(chainId string) *ChainIBCInfo {
	for _, cii := range infos {
		if cii.Counterparty.ChainId == chainId {
			return cii
		}
	}
	return nil
}
