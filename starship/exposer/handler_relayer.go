package main

import (
	"context"
	"fmt"

	pb "github.com/hyperweb-io/starship/exposer/exposer"
	"go.uber.org/zap"
)

// CreateChannel function runs the hermes command to create a channel between 2 given chains
func (a *AppServer) CreateChannel(ctx context.Context, req *pb.RequestCreateChannel) (*pb.ResponseCreateChannel, error) {
	ok := a.mu.TryLock()
	if !ok {
		return nil, ErrResourceInUse
	}
	defer a.mu.Unlock()

	// note: for cli one time txn, use `config-cli.toml` file
	createCmd := fmt.Sprintf("hermes --config /root/.hermes/config-cli.toml create channel --a-chain %s --a-port %s --b-port %s --yes", req.AChain, req.APort, req.BPort)

	if req.AConnection != nil {
		createCmd += fmt.Sprintf(" --a-connection %s", *req.AConnection)
	} else {
		createCmd += " --new-connection"
	}
	if req.ChannelVersion != nil {
		createCmd += fmt.Sprintf(" --channel-version %s", *req.ChannelVersion)
	}
	if req.Order != nil {
		createCmd += fmt.Sprintf(" --order %s", *req.Order)
	}
	a.logger.Debug("running command:", zap.String("cmd", createCmd))

	output, err := runCommand(createCmd)
	if err != nil {
		return nil, err
	}

	return &pb.ResponseCreateChannel{Status: string(output)}, nil
}
