# Starship

<p align="center" width="100%">
    <img height="148" src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" />
</p>

<p align="center" width="100%">
   <a href="https://github.com/hyperweb-io/starship/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/releases/latest"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/release.yaml/badge.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/build.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/build.yaml/badge.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/pr-tests.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/pr-tests.yaml/badge.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/docs.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/docs.yaml/badge.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/starship-docker.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/starship-docker.yaml/badge.svg"></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" /></a>
</p>

Universal interchain development environment in k8s. The vision of this project
is to have a single easy to use developer environment with full testing support
for multichain use cases

## Prerequisites
To get started, you’ll need:

* Kubernetes setup (recommended: Docker Desktop with kubernetes support for local setups): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* `kubectl`: [Installation Guide](https://kubernetes.io/docs/tasks/tools/)
* `helm`: [Installation Guide](https://helm.sh/docs/intro/install/)

For further information, refer to the [Starship Documentation](https://docs.cosmology.zone/starship/get-started/step-2) on kubernetes setup and configuration.

## Install

Install the CLI `@starship-ci/cli`:

```sh
npm install -g @starship-ci/cli
```

## Configuration
To configure Starship for multichain support, create a configuration file (e.g., `config.yaml`).
Here’s a sample configuration:

```yaml
name: starship-localnet
version: 1.6.0

chains:
- id: osmosis-1
  name: osmosis
  numValidators: 2
  ports:
    rest: 1313
    rpc: 26653
    faucet: 8003
- id: cosmoshub-4
  name: cosmoshub
  numValidators: 2
  ports:
    rest: 1317
    rpc: 26657
    faucet: 8007

relayers:
- name: osmos-cosmos
  type: hermes
  replicas: 1
  chains:
    - osmosis-1
    - cosmoshub-4

explorer:
  enabled: true
  ports:
    rest: 8080

registry:
  enabled: true
  ports:
    rest: 8081
```

For more details on the configuration options and directives available, refer to the [Starship Config](https://docs.cosmology.zone/starship/config).

## Versions & Compatibility

### Current Versions
| Component	           | Version | Link                                                                                |
|------------------------|---------|-------------------------------------------------------------------------------------|
| Helm Chart             | 	1.6.0  | 	-                                                                                  |
| Starship NPM CLI       | 	3.6.0  | [NPM](https://www.npmjs.com/package/@starship-ci/client/v/3.6.0)                    |
| NPM Client             | 3.6.0   | [NPM](https://www.npmjs.com/package/@starship-ci/cli/v/3.6.0)                       |
| NPM StarshipJS         | 	3.3.0  | 	[NPM](https://www.npmjs.com/package/starshipjs/v/3.3.0)                            |
| Starship GitHub Action | 	0.5.9  | 	[Github Action](https://github.com/hyperweb-io/starship-action/releases/tag/0.5.9) |

### Compatibility Matrix
| Starship Version | 	Helm Chart | 	NPM CLI | 	NPM Client | 	StarshipJS | 	GitHub Action |
|------------------|-------------|----------|-------------|-------------|----------------|
| 1.6.0            | 	✅ 1.6.0    | 	✅ 3.6.0 | 	✅ 3.6.0    | 	✅ 3.3.0    | 	✅ 0.5.9       |
| 1.5.0            | 	✅ 1.5.0    | 	✅ 3.5.0 | 	✅ 3.5.0    | 	✅ 3.3.0    | 	✅ 0.5.9       |
| 1.4.0            | 	✅ 1.4.0    | 	✅ 3.4.0 | 	✅ 3.4.0    | 	✅ 3.3.0    | 	✅ 0.5.9       |
| 1.3.0            | 	✅ 1.3.0    | 	✅ 3.3.0 | 	✅ 3.3.0    | 	✅ 3.3.0    | 	✅ 0.5.9       |
| 1.2.0            | 	✅ 1.2.0    | 	✅ 3.2.0 | 	✅ 3.2.0    | 	✅ 3.0.0    | 	✅ 0.5.8       |
| 1.1.0            | 	✅ 1.1.0    | 	✅ 3.1.0 | 	✅ 3.1.0    | 	✅ 3.0.0    | 	✅ 0.5.6       |
| 1.0.0            | 	✅ 1.0.0    | 	✅ 3.0.0 | 	✅ 3.0.0    | 	✅ 3.0.0    | 	✅ 0.5.5       | 

> Note: Starship version 1.2.0+ requires Helm 1.2.0+ and NPM CLI 3.2.0+ for full functionality.

## Running Starship

### Deploying 🚀

```sh
yarn starship start --config config.yaml
```

### Teardown 🛠️

```sh
# stop ports and delete deployment
yarn starship stop --config config.yaml
```

## Migration to v1

If you are migrating from a previous version of Starship, and you face following error:
```bash
Error: repository name (starship) already exists, please specify a different name
```

Please run the following command:
```bash
helm repo remove starship
```

Then one can run:
```bash
yarn starship start --config config.yaml
```

## Recommended Usage 📘

Stay tuned for a `create-cosmos-app` boilerplate! For now, this is the most recommended setup. Consider everything else after this section "advanced setup".

- We recommend studying the [osmojs starship integration](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship) and replicating it.
- Add your configs, similar to how it's done [here](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship/configs)
- Add your workflows for GitHub Actions [like this](https://github.com/osmosis-labs/osmojs/blob/main/.github/workflows/e2e-tests.yaml)
- Add `yarn starship` commands to your package.json scripts [like this](https://github.com/osmosis-labs/osmojs/blob/c456184666eda55cd6fee5cd09ba6c05c898d55c/packages/osmojs/package.json#L31-L34)
— Note the jest configurations in the [osmojs package](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs)

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

🛠 Built by Hyperweb (formerly Cosmology) — if you like our tools, please checkout and contribute to [our github ⚛️](https://github.com/hyperweb-io)

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED “AS IS”, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hyperweb-io/starship&type=Date)](https://star-history.com/#hyperweb-io/starship&Date)

