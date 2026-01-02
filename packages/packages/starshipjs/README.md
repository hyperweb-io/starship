# StarshipJS

<p align="center">
  <img src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" width="80"><br />
  StarshipJS enables developers to efficiently set up and test chains, explorers, and validators, making it easier to handle development projects spanning several blockchain networks.
</p>

<p align="center" width="100%">
  <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml">
    <img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" />
  </a><a href="https://github.com/hyperweb-io/starship/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

**StarshipJS** is the JS companion to deploy and manage [Starship](https://cosmology.zone/products/starship), tailored specifically for Node.js and TypeScript developers. This toolkit provides a seamless, easy-to-use interface that dramatically simplifies the development, testing, and deployment of interchain applications, whether on your local machine or CI/CD environments.

Designed with simplicity and speed in mind, **StarshipJS** enables developers to quickly integrate Starship into their blockchain projects without complex orchestration.

## Features

👨🏻‍💻 **Node.js and TypeScript Focused**: Tailored specifically for JavaScript ecosystems, **StarshipJS** brings simplicity to multi-chain development for Node.js and TypeScript environments, streamlining the setup and coding processes.

🚀 **Simplified Interchain Development**: Enables the straightforward creation of applications that span multiple blockchain networks. This simplifies complex blockchain interactions, enhancing interoperability and making it easier to build sophisticated interchain solutions.

🔒 **Security-First Approach**: **StarshipJS** incorporates security best practices from the ground up. Facilitates secure coding practices and configurations, helping developers build secure blockchain applications by default, reducing the risk of vulnerabilities.

## Table of contents

- [StarshipJS](#starshipjs)
- [Table of contents](#table-of-contents)
- [Install](#install)
- [Using with CI/CD](#using-with-cicd)
- [Using the Client](#using-the-client)
- [Developing](#developing)
- [Credits](#credits)

## Install

Install the test utilities `starshipjs`:

```sh
npm install starshipjs
```

## Using with CI/CD

NOTE: Before you code! You'll want to use the CLI tool ([`@starship-ci/cli`](https://github.com/hyperweb-io/starship/tree/main/packages/packages/cli)) in a package.json to get starship working.

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

## Using the Client

StarshipJS is a utility library that provides helpers to leverage [Starship](https://github.com/hyperweb-io/starship)'s internal chain registry, emulating the style of code used in projects like [cosmos-kit](https://github.com/hyperweb-io/cosmos-kit).

### Configuration

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