package main

import (
	"context"
	"fmt"
	"go.uber.org/zap"
	"os"
	"os/exec"
	"strings"
	"sync"
)

// File responsible for having functions that will perform kubectl port-froward.
// for the first pass, we will just run a exec commond that runns the kubectl cmd in the
// background. We will also need to provide a function to kill this process as well
var defaultCometmockPort = 22331
var defaultPorts = map[string]map[string]int{
	"chain": {
		"rest":    1317,
		"rpc":     26657,
		"grpc":    9090,
		"faucet":  8000,
		"exposer": 8081,
	},
	"relayer": {
		"rest":    3000,
		"exposer": 8081,
	},
	"explorer": {
		"rest": 8080,
	},
	"registry": {
		"rest": 8080,
		"grpc": 9090,
	},
	"monitoring": {
		"prometheus": 8080,
		"grafana":    8080,
	},
}

// portForward function with perform port-forwarding based on
// kubectl port-forward <resource> <localPort>:<removePort>
func (c *Client) execPortForwardCmd(resource string, localPort, remotePort int) *exec.Cmd {
	cmdArgs := fmt.Sprintf("port-forward %s %v:%v", resource, localPort, remotePort)
	if c.config.Namespace != "" {
		cmdArgs += fmt.Sprintf(" -n %s", c.config.Namespace)
	}
	cmd := exec.Command("kubectl", strings.Split(cmdArgs, " ")...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ() // pass through environment variables
	return cmd
}

// PortForwardCmds returns a list of exec commands for port-fowrarding from a config file
func (c *Client) PortForwardCmds() ([]*exec.Cmd, []string, error) {
	config := c.helmConfig

	var cmds []*exec.Cmd
	var msgs []string

	// port-forward all chains
	for _, chain := range config.Chains {
		for portType, remotePort := range defaultPorts["chain"] {
			port := chain.Ports.GetPort(portType)
			if port == 0 {
				continue
			}
			podName := "genesis"
			if portType == "rpc" && (chain.Cometmock != nil && chain.Cometmock.Enabled) {
				remotePort = defaultCometmockPort
				portType = "cometmock-rpc"
				podName = "cometmock"
			}
			msgs = append(msgs, fmt.Sprintf("port-forwarding: %s: port %s: to: http://localhost:%d", chain.GetName(), portType, port))
			cmds = append(cmds, c.execPortForwardCmd(fmt.Sprintf("pods/%s-%s-0", chain.GetName(), podName), port, remotePort))
		}
	}
	for _, relayer := range config.Relayers {
		for portType, remotePort := range defaultPorts["relayer"] {
			port := relayer.Ports.GetPort(portType)
			if port == 0 {
				continue
			}
			msgs = append(msgs, fmt.Sprintf("port-forwarding: %s: port %s: to: http://localhost:%d", relayer.GetName(), portType, port))
			cmds = append(cmds, c.execPortForwardCmd(fmt.Sprintf("pods/%s-0", relayer.GetName()), port, remotePort))
		}
	}
	// port-forward explorer
	if config.Explorer != nil && config.Explorer.Enabled {
		for portType, remotePort := range defaultPorts["explorer"] {
			port := config.Explorer.Ports.GetPort(portType)
			if port == 0 {
				continue
			}
			msgs = append(msgs, fmt.Sprintf("port-forwarding: %s: port %s: to: http://localhost:%d", "explorer", portType, port))
			cmds = append(cmds, c.execPortForwardCmd("svc/explorer", port, remotePort))
		}
	}
	// port-forward registry
	if config.Registry != nil && config.Registry.Enabled {
		for portType, remotePort := range defaultPorts["registry"] {
			port := config.Registry.Ports.GetPort(portType)
			if port == 0 {
				continue
			}
			msgs = append(msgs, fmt.Sprintf("port-forwarding: %s: port %s: to: http://localhost:%d", "registry", portType, port))
			cmds = append(cmds, c.execPortForwardCmd("svc/registry", port, remotePort))
		}
	}
	// port-forward monitoring
	if config.Monitoring != nil && config.Monitoring.Enabled {
		for portType, remotePort := range defaultPorts["monitoring"] {
			port := config.Registry.Ports.GetPort(portType)
			if port == 0 {
				continue
			}
			msgs = append(msgs, fmt.Sprintf("port-forwarding: %s: port %s: to: http://localhost:%d", "monitoring", portType, port))
			// monitoring service have 2 underlying services, prometheus and grafana
			// we can select service based on portType itself
			cmds = append(cmds, c.execPortForwardCmd(fmt.Sprintf("svc/%s", portType), port, remotePort))
		}
	}

	return cmds, msgs, nil
}

// RunPortForward function performs the exec commands to run the port-forwarding
func (c *Client) RunPortForward(cliCtx context.Context) error {
	// check status of pods
	if err := c.CheckPortForward(); err != nil {
		return fmt.Errorf("pods are not found in running state, check manually with `kubectl get pods` to make sure all pods are `Running` before trying to connect. err: %w", err)
	}

	cmds, msgs, err := c.PortForwardCmds()
	if err != nil {
		return err
	}

	// run all cmds in parallel go-routines
	ctx, cancel := context.WithCancel(cliCtx)
	defer cancel()

	var wg sync.WaitGroup
	resultChan := make(chan error, len(cmds))

	c.logger.Debug("commands to run", zap.Int("num_cmds", len(cmds)))
	for _, cmd := range cmds {
		wg.Add(1)
		c.logger.Debug(fmt.Sprintf("runing cmd: %s", cmd.String()))
		go func(ctx context.Context, cmd *exec.Cmd, g *sync.WaitGroup, resultChan chan error) {
			if err := cmd.Run(); err != nil {
				select {
				case resultChan <- err:
				case <-ctx.Done():
				}
			}
		}(ctx, cmd, &wg, resultChan)
	}

	// log port forwarded endpoints to localhost
	c.logger.Info("Port forwarding")
	for _, msg := range msgs {
		c.logger.Info(msg)
	}

	// Start a goroutine to monitor the result channel and cancel if any error occurs
	go func() {
		for err := range resultChan {
			fmt.Printf("Command failed: %v\n", err)
			cancel()
		}
	}()

	// Wait for all commands to finish
	wg.Wait()

	// Close the result channel
	close(resultChan)

	c.logger.Debug("port-forward in progress... exit with Ctlr+C")

	return nil
}

func strInList(strs []string, str string) bool {
	for _, s := range strs {
		if strings.Contains(s, str) {
			return true
		}
	}
	return false
}

func (c *Client) CheckKubectl() error {
	if _, err := exec.LookPath("kubectl"); err != nil {
		return fmt.Errorf("kubectl not found in $PATH. Make sure you have installed kubectl. Follow: https://kubernetes.io/docs/tasks/tools/#kubectl. err: %w", err)
	}
	return nil
}

// CheckPortForward verify if all pods are in running state, and ready to be port-forwarded
// * perform kubectl get pods
// * check status of pods to be running based on the config
// * return error if port-forwarding is not ready
func (c *Client) CheckPortForward() error {
	config := c.helmConfig

	cmdArgs := "get pods --field-selector=status.phase=Running --no-headers --output name"
	if c.config.Namespace != "" {
		cmdArgs += fmt.Sprintf(" -n=%s", c.config.Namespace)
	}

	cmd := exec.Command("kubectl", strings.Split(cmdArgs, " ")...)
	c.logger.Debug(fmt.Sprintf("running command: %s", cmd.String()))
	//cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	out, err := cmd.Output()
	if err != nil {
		return err
	}
	pods := strings.Split(string(out), "\n")

	c.logger.Debug(fmt.Sprintf("pods in running state: %s", strings.Join(pods, ",")))

	// check chain pods are running
	for _, chain := range config.Chains {
		if !strInList(pods, fmt.Sprintf("%s-genesis-0", chain.GetName())) {
			return fmt.Errorf("chain %s pod not found in running pods: %s", chain.GetName(), strings.Join(pods, ","))
		}
	}
	// check registry pods are running
	if config.Registry != nil {
		if config.Registry.Enabled {
			if !strInList(pods, "registry-") {
				return fmt.Errorf("registry pod not found in running pods: %s", strings.Join(pods, ","))
			}
		}
	}
	// check explorer pods are running
	if config.Explorer != nil {
		if config.Explorer.Enabled {
			if !strInList(pods, "explorer-") {
				return fmt.Errorf("explorer pod not found in running pods: %s", strings.Join(pods, ","))
			}
		}
	}

	return nil
}
