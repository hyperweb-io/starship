# @starship-ci/client

<p align="center">
  <img src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" width="80"><br />
  Starship Client enables developers to efficiently set up and test chains, explorers, and validators, making it easier to handle development projects spanning several blockchain networks.
</p>

<p align="center" width="100%">
  <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml">
    <img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" />
  </a><a href="https://github.com/hyperweb-io/starship/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

**Starship Client** is the programmatic interface to deploy and manage [Starship](https://cosmology.zone/products/starship), tailored specifically for Node.js and TypeScript developers. This toolkit provides a seamless, easy-to-use interface that dramatically simplifies the development, testing, and deployment of interchain applications, whether on your local machine or CI/CD environments.

Designed with simplicity and speed in mind, **Starship Client** enables developers to quickly integrate Starship into their blockchain projects without complex orchestration.

## Features

👨🏻‍💻 **Node.js and TypeScript Focused**: Tailored specifically for JavaScript ecosystems, **Starship Client** brings simplicity to multi-chain development for Node.js and TypeScript environments, streamlining the setup and coding processes.

🚀 **Simplified Interchain Development**: Enables the straightforward creation of applications that span multiple blockchain networks. This simplifies complex blockchain interactions, enhancing interoperability and making it easier to build sophisticated interchain solutions.

🔒 **Security-First Approach**: **Starship Client** incorporates security best practices from the ground up. Facilitates secure coding practices and configurations, helping developers build secure blockchain applications by default, reducing the risk of vulnerabilities.

## Table of contents

- [@starship-ci/client](#starship-ciclient)
- [Table of contents](#table-of-contents)
- [Install](#install)
- [Recommended Usage](#recommended-usage-📘)
  - [Deploying Starship](#deploying-starship-🚀)
  - [Running End-to-End Tests](#running-end-to-end-tests-🧪)
  - [Teardown](#teardown-🛠️)
- [Advanced Usage](#advanced-usage)
  - [Initializing the Client](#initializing-the-client)
  - [Configuration](#configuration)
  - [Starting Port Forwarding](#setting-up-and-installing-the-chart)
  - [Stopping And Cleaning up](#stopping-and-cleaning-up)
- [Developing](#developing)
- [Credits](#credits)

## Install

Install the test utilities library, `@starship-ci/client` with `npm` or `yarn`:

```sh
npm install @starship-ci/client
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

# sanity check
yarn starship get-pods
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

## Advanced Usage 

### Manual setup

Instead of using `yarn starship start`, you can also to each step, and do checks in between:

```sh
# setup helm/starship
yarn starship setup

# sanity check
yarn starship get-pods

# deploy starship
yarn starship deploy

# wait til STATUS=Running
yarn starship get-pods

# port forwarding
yarn starship start-ports

# check pids
yarn starship port-pids
```

The `StarshipClient` simplifies managing Kubernetes resources, specifically tailored for developers working in interchain environments. Below is an example showing how to instantiate the client and use it to manage a Helm deployment:

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
  version: '1.8.0'
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