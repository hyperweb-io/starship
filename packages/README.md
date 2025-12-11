# StarshipJS

<p align="center">
  <img src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" width="80"><br />
  StarshipJS enables developers to efficiently set up and test chains, explorers, and validators, making it easier to handle development projects spanning several blockchain networks.
</p>

<p align="center" width="100%">
  <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml">
    <img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" />
  </a><a href="https://github.com/hyperweb-io/starship/blob/main/packages/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

**StarshipJS** is the JS companion to deploy and manage [Starship](https://cosmology.zone/products/starship), tailored specifically for Node.js and TypeScript developers. This toolkit provides a seamless, easy-to-use interface that dramatically simplifies the development, testing, and deployment of interchain applications, whether on your local machine or CI/CD environments.

Designed with simplicity and speed in mind, **StarshipJS** enables developers to quickly integrate Starship into their blockchain projects without complex orchestration.

## Features

👨🏻‍💻 **Node.js and TypeScript Focused**: Tailored specifically for JavaScript ecosystems, **StarshipJS** brings simplicity to multi-chain development for Node.js and TypeScript environments, streamlining the setup and coding processes.

🚀 **Simplified Interchain Development**: Enables the straightforward creation of applications that span multiple blockchain networks. This simplifies complex blockchain interactions, enhancing interoperability and making it easier to build sophisticated interchain solutions.

🔒 **Security-First Approach**: **StarshipJS** incorporates security best practices from the ground up. Facilitates secure coding practices and configurations, helping developers build secure blockchain applications by default, reducing the risk of vulnerabilities.

## Packages

- [`StarshipJS`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/starshipjs): A JavaScript library providing the foundational tools and utilities for starship development, designed to work seamlessly with Node.js and TypeScript.
- [`StarshipJS CLI`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/cli): The command-line interface that allows developers to easily deploy, manage, and interact with starship directly from the terminal.
- [`StarshipJS Client`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/client): A client library that encapsulates interaction with starship, simplifying command executions and state management through an intuitive API.

## Table of contents

- [StarshipJS](#starshipjs)
- [Features](#features)
- [Packages](#packages)
- [Table of contents](#table-of-contents)
- [Install](#install)
- [Recommended Usage](#recommended-usage-📘)
  - [Deploying Starship](#deploying-starship-🚀)
  - [Running End-to-End Tests](#running-end-to-end-tests-🧪)
  - [Teardown](#teardown-🛠️)
- [CLI Usage](#cli-usage)
  - [Install the CLI](#install-the-cli)
  - [Run Starship](#run-starship)
  - [Teardown Starship](#teardown-starship)
- [StarshipClient Usage](#starshipclient-usage)
  - [Initializing the Client](#initializing-the-client)
  - [Configuration](#configuration)
  - [Setting UP and Installing the Chart](#setting-up-and-installing-the-chart)
  - [Starting Port Forwarding](#starting-port-forwarding)
  - [Stopping and Cleaning Up](#stopping-and-cleaning-up)
- [Developing](#developing)
- [Credits](#credits)

## Install

Install the test utilities `starshipjs` and the CI client `@starship-ci/client`:

```sh
npm install starshipjs @starship-ci/client
```

### Recommended Usage 📘

Stay tuned for a `create-cosmos-app` boilerplate! For now, this is the most recommended setup. Consider everything else after this section "advanced setup".

- We recommend studying the [osmojs starship integration](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship) and replicating it.
- Add your configs, similar to how it's done [here](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship/configs)
- Add your workflows for GitHub Actions [like this](https://github.com/osmosis-labs/osmojs/blob/main/.github/workflows/e2e-tests.yaml)
- Add `yarn starship` commands to your package.json scripts [like this](https://github.com/osmosis-labs/osmojs/blob/c456184666eda55cd6fee5cd09ba6c05c898d55c/packages/osmojs/package.json#L31-L34)
— Note the jest configurations in the [osmojs package](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs)


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

See more usage in the [`StarshipJS CLI`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/cli) documentation.

### Install the CLI

While it's not recommended due to upgrades and package management, you can install globally:

```sh
npm install -g @starship-ci/cli
```

### Run starship

```sh
starship start --config ./config/settings.json
```

### Run starhip (manually)
```sh
starship setup --config ./config/settings.json
starship deploy --config ./config/settings.json
starship start-ports --config ./config/settings.json
```

### Teardown starship

```sh
starship undeploy --config ./config/settings.json
starship teardown --config ./config/settings.json
```

## StarshipClient Usage

See more info in the [`StarshipJS Client`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/client) documentation.

### Install the StarshipClient

Install the CI client `@starship-ci/client`:

```sh
npm install @starship-ci/client
```

### Initializing the Client

First, you need to import and initialize the `StarshipClient` with your Helm configuration:

```js
import {StarshipClient} from '@starship-ci/client';

const client = new StarshipClient({
  name: 'osmojs',
  config: 'path/to/config.yaml',
  repo: 'starship',
  repoUrl: 'https://hyperweb-io.github.io/starship/',
  chart: 'devnet',
  version: 'v0.2.3'
});
```

### Configuration

After initializing, you can load in your config. Assuming you have a `yaml` file:

```js
client.loadConfig();
```

If you don't have one, you can set and save a configuration directly from the client:

```js
client.setConfig(config);
client.saveConfig(config);
```

### Setting Up and Installing the Chart

After initializing, set up the environment and install the starship helm chart:

```js
// adds helm chart to registry
client.setup();
// installs helm chart
client.deploy();
```

### Starting Port Forwarding

For local development, you might need to forward ports from your Kubernetes pods:

```js
client.startPortForward();
```

### Stopping and Cleaning Up

Once done with development or testing, you can stop the port forwarding and remove the Helm chart:

```js
// stop port forwarding
// remove the deployed release from your Kubernetes cluster
client.undeploy();

// remove the helm chart
client.teardown();
```

## StarshipJS Usage

[`StarshipJS`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/starshipjs) is a utility library that provides helpers to leverage [Starship](https://github.com/hyperweb-io/starship)'s internal chain registry, emulating the style of code used in projects like [cosmos-kit](https://github.com/hyperweb-io/cosmos-kit).

### StarshipJS Configuration

Before using StarshipJS, you need to set up the configuration for your blockchain network.

```js
import { ConfigContext } from 'starshipjs';
import { join } from 'path';

// Path to your YAML configuration file
const configFile = join(__dirname, 'your-config.yaml');

// using init for init the config and a default connected registry fetcher.
await ConfigContext.init(configFile);

```

### Registry

Using init for init the config and pass an optional customized registry fetcher.

```js
import { useRegistry, ConfigContext } from 'starshipjs';
import { join } from 'path';

// Path to your YAML configuration file
const configFile = join(__dirname, 'your-config.yaml');

const fetcher = new ChainRegistryFetcher({
  // your own options
});

await ConfigContext.init(configFile, fetcher);
```

Or use `useRegistry` to get a registry fetcher.

```js
import { useRegistry, ConfigContext } from 'starshipjs';
import { join } from 'path';

// Path to your YAML configuration file
const configFile = join(__dirname, 'your-config.yaml');

const fetcher = await useRegistry(configFile);

await ConfigContext.init(configFile, fetcher);
```

## Chain Info

Get detailed chain information about the blockchain network:

```js
const { chainInfo } = useChain('osmosis');

console.log(chainInfo);
```

## Credits and Faucets

If your blockchain network supports faucets, you can use them to get test tokens:

```js
const { creditFromFaucet } = useChain('osmosis');
const address = 'your-blockchain-address';

await creditFromFaucet(address);
```

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

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED “AS IS”, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
