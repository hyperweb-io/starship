package main

import (
	"context"
	"encoding/json"
	pb "exposer/exposer"
	"fmt"
	"io"
	"net/http"
	"os"

	"go.uber.org/zap"
)

func fetchNodeStatus(url string) (StatusResponse, error) {
	var statusResp StatusResponse

	resp, err := http.Get(url)
	if err != nil {
		return statusResp, fmt.Errorf("unable to fetch status, err: %d", err)
	}

	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
		return statusResp, fmt.Errorf("unable to parse status response, err: %d", err)
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

func (a *AppServer) GetNodeID(ctx context.Context) (*pb.ResponseNodeID, error) {
	status, err := fetchNodeStatus(a.config.StatusURL)
	if err != nil {
		return nil, err
	}

	return &pb.ResponseNodeID{NodeId: status.Result.NodeInfo.ID}, nil
}

func (a *AppServer) GetPubKey(ctx context.Context) (*pb.ResponsePubKey, error) {
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

func (a *AppServer) GetGenesisFile(ctx context.Context) (*pb.ResponseFileData, error) {
	data, err := a.readJSONFile(a.config.GenesisFile)
	if err != nil {
		return nil, err
	}

	return &pb.ResponseFileData{Data: data}, nil
}

func (a *AppServer) GetKeysFile(ctx context.Context) (*pb.ResponseFileData, error) {
	data, err := a.readJSONFile(a.config.MnemonicFile)
	if err != nil {
		return nil, err
	}

	return &pb.ResponseFileData{Data: data}, nil
}

func (a *AppServer) GetPrivKeysFile(ctx context.Context) (*pb.ResponseFileData, error) {
	data, err := a.readJSONFile(a.config.PrivValFile)
	if err != nil {
		return nil, err
	}

	return &pb.ResponseFileData{Data: data}, nil
}
