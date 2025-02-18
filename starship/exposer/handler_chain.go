package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"

	"github.com/golang/protobuf/jsonpb"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/structpb"

	pb "github.com/hyperweb-io/starship/exposer/exposer"
)

func fetchNodeStatus(url string) (*pb.Status, error) {
	statusResp := &pb.Status{}

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("unable to fetch status, err: %d", err)
	}

	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(statusResp); err != nil {
		return nil, fmt.Errorf("unable to parse status response, err: %d", err)
	}

	return statusResp, nil
}

func (a *AppServer) readJSONFile(filePath string) ([]byte, error) {
	jsonFile, err := os.Open(filePath)
	if err != nil {
		a.logger.Error("Error opening file",
			zap.String("file", filePath),
			zap.Error(err))
		return nil, fmt.Errorf("error opening json file: %s", filePath)
	}

	return io.ReadAll(jsonFile)
}

func (a *AppServer) GetNodeID(ctx context.Context, _ *emptypb.Empty) (*pb.ResponseNodeID, error) {
	jsonFile, err := os.Open(a.config.NodeIDFile)
	if err != nil {
		return nil, err
	}

	data := &pb.ResponseNodeID{}
	err = jsonpb.Unmarshal(jsonFile, data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (a *AppServer) GetPubKey(ctx context.Context, _ *emptypb.Empty) (*pb.ResponsePubKey, error) {
	status, err := fetchNodeStatus(a.config.StatusURL)
	if err != nil {
		return nil, err
	}

	resPubKey := &pb.ResponsePubKey{
		Type: "/cosmos.crypto.ed25519.PubKey",
		Key:  status.Result.ValidatorInfo.PubKey.Value,
	}

	return resPubKey, nil
}

func (a *AppServer) GetGenesisFile(ctx context.Context, _ *emptypb.Empty) (*structpb.Struct, error) {
	jsonFile, err := os.Open(a.config.GenesisFile)
	if err != nil {
		return nil, err
	}

	byteValue, err := ioutil.ReadAll(jsonFile)
	if err != nil {
		return nil, err
	}

	state := map[string]interface{}{}

	err = json.Unmarshal(byteValue, &state)
	if err != nil {
		return nil, err
	}

	return structpb.NewStruct(state)
}

func (a *AppServer) GetGenesisSSZ(ctx context.Context, _ *emptypb.Empty) (*pb.ResponseFileData, error) {
	data, err := os.ReadFile(a.config.GenesisSSZ)
	if err != nil {
		return nil, err
	}

	// Return the file as raw bytes
	return &pb.ResponseFileData{Data: data}, nil
}

func (a *AppServer) GetConfigFile(ctx context.Context, _ *emptypb.Empty) (*pb.ResponseFileData, error) {
	data, err := os.ReadFile(a.config.ConfigFile)
	if err != nil {
		return nil, err
	}

	// Return the file as raw bytes
	return &pb.ResponseFileData{Data: data}, nil
}

func (a *AppServer) GetKeys(ctx context.Context, _ *emptypb.Empty) (*pb.Keys, error) {
	jsonFile, err := os.Open(a.config.MnemonicFile)
	if err != nil {
		return nil, err
	}

	keys := &pb.Keys{}
	err = jsonpb.Unmarshal(jsonFile, keys)
	if err != nil {
		return nil, err
	}

	return keys, nil
}

func (a *AppServer) GetPrivKey(ctx context.Context, _ *emptypb.Empty) (*pb.PrivValidatorKey, error) {
	jsonFile, err := os.Open(a.config.PrivValFile)
	if err != nil {
		return nil, err
	}

	keys := &pb.PrivValidatorKey{}
	err = jsonpb.Unmarshal(jsonFile, keys)
	if err != nil {
		return nil, err
	}

	return keys, nil
}

func (a *AppServer) GetPrivValidatorState(ctx context.Context, _ *emptypb.Empty) (*pb.PrivValidatorState, error) {
	jsonFile, err := os.Open(a.config.PrivValStateFile)
	if err != nil {
		return nil, err
	}

	data := &pb.PrivValidatorState{}
	err = jsonpb.Unmarshal(jsonFile, data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (a *AppServer) GetNodeKey(ctx context.Context, _ *emptypb.Empty) (*pb.NodeKey, error) {
	jsonFile, err := os.Open(a.config.NodeKeyFile)
	if err != nil {
		return nil, err
	}

	keys := &pb.NodeKey{}
	err = jsonpb.Unmarshal(jsonFile, keys)
	if err != nil {
		return nil, err
	}

	return keys, nil
}
