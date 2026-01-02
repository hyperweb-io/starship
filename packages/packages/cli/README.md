# Starship CLI

<p align="center">
  <img src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" width="80"><br />
  Starship enables developers to efficiently set up and test chains, explorers, and validators, making it easier to handle development projects spanning several blockchain networks.
</p>

<p align="center" width="100%">
  <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml">
    <img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" />
  </a><a href="https://github.com/hyperweb-io/starship/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

**`starship`** is the command-line interface designed to deploy and manage [Starship](https://cosmology.zone/products/starship), catering specifically to Node.js and TypeScript developers. This CLI tool offers a seamless and intuitive interface that dramatically simplifies the development, testing, and deployment of interchain applications across both local environments and CI/CD pipelines.

Designed with simplicity and speed in mind, **Starship** enables developers to quickly integrate Starship into their blockchain projects without complex orchestration.

## Table of contents

- [Starship CLI](#starship-cli)
- [Table of contents](#table-of-contents)
- [Install](#install)
- [Recommended Usage](#recommended-usage-📘)
  - [Deploying Starship](#deploying-starship-🚀)
  - [Running End-to-End Tests](#running-end-to-end-tests-🧪)
  - [Teardown](#teardown-🛠️)
- [CLI Usage](#cli-usage)
  - [CLI Examples](#cli-examples)
  - [CLI Commands](#cli-commands)
  - [CLI Options](#cli-options)
- [Developing](#developing)
- [Credits](#credits)

## Install

Install `@starship-ci/cli` with `npm` or `yarn`:

```sh
npm install @starship-ci/cli
```

### Recommended Usage 📘

Stay tuned for a `create-cosmos-app` boilerplate! For now, this is the most recommended setup. Consider everything else after this section "advanced setup".

- We recommend studying the [osmojs starship integration](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship) and replicating it.
- Add your configs, similar to how it's done [here](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship/configs)
- Add your workflows for GitHub Actions [like this](https://github.com/osmosis-labs/osmojs/blob/main/.github/workflows/e2e-tests.yaml)
- Add `yarn starship` commands to your package.json scripts [like this](https://github.com/osmosis-labs/osmojs/blob/c456184666eda55cd6fee5cd09ba6c05c898d55c/packages/osmojs/package.json#L31-L34)
— Note the jest configurations in the [osmojs package](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs)

## Using with CI/CD

### Install the packages

Install `@starship-ci/cli` and `starshipjs`

```sh
yarn add --dev starshipjs @starship-ci/cli
```

Add your configuration files, similar to these:

- [Example `config.yaml`](https://github.com/osmosis-labs/osmojs/blob/main/packages/osmojs/starship/configs/config.yaml)

- [Example `starship.yaml`](https://github.com/osmosis-labs/osmojs/blob/main/packages/osmojs/starship/configs/starship.yaml)

- [Example `jest.config.js`](https://github.com/osmosis-labs/osmojs/blob/main/packages/osmojs/jest.starship.config.js)


### Update your `package.json` `scripts`:

```json
"starship": "starship --config ./starship/configs/starship.yaml",
"starship:test": "jest --config ./jest.starship.config.js --verbose --bail",
"starship:watch": "jest --watch --config ./jest.starship.config.js"
```

See an [example here](https://github.com/osmosis-labs/osmojs/blob/main/packages/osmojs/package.json).

### Start starship 🚀

```sh
yarn starship start
```

### Manual setup & start

```sh
yarn starship setup
yarn starship deploy
yarn starship start-ports
```

### Stopping starship

```sh
yarn starship stop
```

This will allow you to run `yarn starship` to `start`, `setup`, `deploy`, `stop` and other `starship` commands:

#### Deploying `Starship` 🚀

```sh
yarn starship start
```

#### Running End-to-End Tests 🧪

```sh
# test
yarn starship:test

# watch 
yarn starship:watch
```

#### Teardown 🛠️

```sh
# stop ports and delete deployment
yarn starship stop
```

## CLI Usage

### Install the CLI

While it's not recommended due to upgrades and package management, you can install globally: 


```sh
npm install -g @starship-ci/cli
```

### CLI Examples 

Here are some common usages of the starship CLI:

```sh
starship setup --helmFile ./config/helm.yaml --helmName my-release
starship deploy --helmFile ./config/helm.yaml --helmName my-release
starship undeploy --config ./config/settings.json
starship setup-kind
starship start-ports
starship stop-ports
starship upgrade
starship teardown
starship clean
```

### CLI Commands

Here's a concise overview of the commands available in the `starship` CLI:


| Command          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `start`          | Setup, Deploy, and Start Ports.   |
| `setup`          | Setup initial configuration and dependencies.   |
| `deploy`         | Deploy starship using specified options or configuration file. |
| `start-ports`    | Start port forwarding for the deployed services. |
| `stop-ports` | Stop port forwarding.                           |
| `teardown`       | Remove all components related to the deployment. |
| `upgrade`        | Upgrade the deployed application to a new version. |
| `undeploy`       | Remove starship deployment using specified options or configuration file. |
| `delete-helm`     | Delete a specific Helm release.                 |
| `remove-helm`     | Remove Helm chart from local configuration.     |
| `setup-kind`      | Setup a Kubernetes kind cluster for development. |
| `clean-kind`      | Clean up Kubernetes kind cluster resources.     |
| `clean`          | Perform a clean operation to tidy up resources. |
| `version`, `-v`  | Display the version of the Starship Client.     |

## CLI Options

Options in the CLI allow for dynamic configuration of `starship`. You can specify individual options directly in the command line to fine-tune the behavior of the tool. Alternatively, you can use the `--config` option to specify a YAML configuration file that sets up the initial parameters. If both methods are used, any options provided directly in the command line will override the corresponding settings in the configuration file, giving you the flexibility to customize specific aspects of the deployment without altering the entire configuration.

| Option             | Description                                           |
|--------------------|-------------------------------------------------------|
| `--config <path>`  | Specify the path to the JSON configuration file containing all settings. |
| `--no-tty`         | for CI/CD, it's a good idea to set `--no-tty` to disable interactive prompts |
| `--helmFile <path>`| Specify the path to the Helm file.                    |
| `--helmName <name>`| Specify the Helm release name.                        |
| `--helmRepo <repo>`| Specify the Helm repository.                          |
| `--helmRepoUrl <url>` | Specify the Helm repository URL.                    |
| `--helmChart <chart>` | Specify the Helm chart.                             |
| `--helmVersion <ver>` | Specify the version of the Helm chart.              |
| `--kindCluster <name>` | Specify the name of the Kubernetes kind cluster.   |
| `--verbose`        | Enable verbose output for debugging purposes.         |
| `--curdir <dir>`   | Specify the current working directory of the operation. |


## Developing

When first cloning the repo:
```
yarn
yarn build
```

## Interchain JavaScript Stack ⚛️

A unified toolkit for building applications and smart contracts in the Interchain ecosystem

| Category              | Tools                                                                                                                  | Description                                                                                           |
|----------------------|------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| **Chain Information**   | [**Chain Registry**](https://github.com/hyperweb-io/chain-registry), [**Utils**](https://www.npmjs.com/package/@chain-registry/utils), [**Client**](https://www.npmjs.com/package/@chain-registry/client) | Everything from token symbols, logos, and IBC denominations for all assets you want to support in your application. |
| **Wallet Connectors**| [**Interchain Kit**](https://github.com/hyperweb-io/interchain-kit)<sup>beta</sup>, [**Cosmos Kit**](https://github.com/hyperweb-io/cosmos-kit) | Experience the convenience of connecting with a variety of web3 wallets through a single, streamlined interface. |
| **Signing Clients**          | [**InterchainJS**](https://github.com/hyperweb-io/interchainjs)<sup>beta</sup>, [**CosmJS**](https://github.com/cosmos/cosmjs) | A single, universal signing interface for any network |
| **SDK Clients**              | [**Telescope**](https://github.com/hyperweb-io/telescope)                                                          | Your Frontend Companion for Building with TypeScript with Cosmos SDK Modules. |
| **Starter Kits**     | [**Create Interchain App**](https://github.com/hyperweb-io/create-interchain-app)<sup>beta</sup>, [**Create Cosmos App**](https://github.com/hyperweb-io/create-cosmos-app) | Set up a modern Interchain app by running one command. |
| **UI Kits**          | [**Interchain UI**](https://github.com/hyperweb-io/interchain-ui)                                                   | The Interchain Design System, empowering developers with a flexible, easy-to-use UI kit. |
| **Testing Frameworks**          | [**Starship**](https://github.com/hyperweb-io/starship)                                                             | Unified Testing and Development for the Interchain. |
| **TypeScript Smart Contracts** | [**Create Hyperweb App**](https://github.com/hyperweb-io/create-hyperweb-app)                              | Build and deploy full-stack blockchain applications with TypeScript |
| **CosmWasm Contracts** | [**CosmWasm TS Codegen**](https://github.com/CosmWasm/ts-codegen)                                                   | Convert your CosmWasm smart contracts into dev-friendly TypeScript classes. |

## Credits

🛠 Built by the [Constructive](https://constructive.io) team — makers of [Hyperweb](https://hyperweb.io)

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.