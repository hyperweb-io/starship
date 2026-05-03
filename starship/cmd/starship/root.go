package main

import (
	"fmt"

	"github.com/urfave/cli/v2"
)

func newStartCommand(config *Config) *cli.Command {
	return &cli.Command{
		Name:      "start",
		Usage:     "start starship resources from a config file",
		UsageText: "start [path to config-file] [options]",
		Flags:     GetCommandLineOptions(),
		Action: func(c *cli.Context) error {
			if err := ParseCLIOptions(c, config); err != nil {
				return cli.Exit(err, 1)
			}
			// set configfile to the Config struct from args if not set
			if config.ConfigFile == "" {
				if c.NArg() > 0 {
					config.ConfigFile = c.Args().Get(0)
				} else {
					return cli.Exit("config file need to be specified", 1)
				}
			}

			client, err := NewClient(config)
			if err != nil {
				return cli.Exit(err, 1)
			}
			defer client.logger.Sync()

			if err := client.AddOrUpdateChartRepo(); err != nil {
				return cli.Exit(err, 1)
			}

			err = client.InstallChart()
			if err != nil {
				return cli.Exit(err, 1)
			}

			return nil
		},
	}
}

func newListCommand(config *Config) *cli.Command {
	return &cli.Command{
		Name:  "list",
		Usage: "list starship charts deployed",
		Flags: GetCommandLineOptions("verbose"),
		Action: func(c *cli.Context) error {
			if err := ParseCLIOptions(c, config); err != nil {
				return cli.Exit(err, 1)
			}

			client, err := NewClient(config)
			if err != nil {
				return cli.Exit(err, 1)
			}
			defer client.logger.Sync()

			res, err := client.ListCharts()
			if err != nil {
				return cli.Exit(err, 1)
			}
			for _, r := range res {
				fmt.Printf("name: %s,\tstatus: %s,\tnamespace: %s\n", r.Name, r.Info.Status, r.Namespace)
			}

			return nil
		},
	}
}

func newStopCommand(config *Config) *cli.Command {
	return &cli.Command{
		Name:  "stop",
		Usage: "stop running starship resources",
		Flags: GetCommandLineOptions("name", "version", "verbose"),
		Action: func(c *cli.Context) error {
			if err := ParseCLIOptions(c, config); err != nil {
				return cli.Exit(err, 1)
			}

			client, err := NewClient(config)
			if err != nil {
				return cli.Exit(err, 1)
			}
			defer client.logger.Sync()

			err = client.DeleteChart(config.Name)
			if err != nil {
				return cli.Exit(err, 1)
			}

			return nil
		},
	}
}

func newConnectCommand(config *Config) *cli.Command {
	return &cli.Command{
		Name:      "connect",
		Usage:     "connect will perform port-forward based on the configfile to localhost ports",
		UsageText: "connect [path to config-file] [options]",
		Flags:     GetCommandLineOptions("config", "namespace", "verbose"),
		Action: func(c *cli.Context) error {
			if err := ParseCLIOptions(c, config); err != nil {
				return cli.Exit(err, 1)
			}
			// set configfile to the Config struct from args if not set
			if config.ConfigFile == "" {
				if c.NArg() > 0 {
					config.ConfigFile = c.Args().Get(0)
				} else {
					return cli.Exit("config file need to be specified", 1)
				}
			}

			client, err := NewClient(config)
			if err != nil {
				return cli.Exit(err, 1)
			}
			defer client.logger.Sync()

			// check kubectl is installed
			err = client.CheckKubectl()
			if err != nil {
				client.logger.Error(err.Error())
				return cli.Exit(err, 1)
			}

			err = client.RunPortForward(c.Context)
			if err != nil {
				client.logger.Error(err.Error())
				return cli.Exit(err, 1)
			}

			return nil
		},
	}
}

func NewApp() *cli.App {
	config := NewDefaultConfig()
	app := cli.NewApp()
	app.Name = Prog
	app.Usage = Description
	app.Version = Version
	app.UsageText = "starship [options]"

	app.Action = func(c *cli.Context) error {
		return nil
	}
	app.Commands = []*cli.Command{
		newStartCommand(config),
		newListCommand(config),
		newStopCommand(config),
		newConnectCommand(config),
	}

	return app
}
