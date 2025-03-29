## Who is using Starship?

### [Agoric SDK](https://github.com/Agoric/agoric-sdk/tree/master/multichain-testing)

Agoric SDK is using Starship to run end-to-end tests for Agoric chain. Runs in CI/CD.
Running 4 chains and relayers between them, then using JS based custom e2e testing system that they built.
### [Mesh-Security](https://github.com/osmosis-labs/mesh-security-sdk/tree/main/tests/starship)

For mesh-security development, Starship is being used to create a dev environment in a cloud cluster to
run 2 chains and a relayer, setup mesh-security contracts between them, as well as spin up mesh-security frontend as well.
### [OsmoJS](https://github.com/osmosis-labs/osmojs/pull/36)

JS library using Starship to run end-to-end tests against Osmosis chain. (Run in CI/CD)
### [persistenceCore](https://github.com/persistenceOne/persistenceCore/pull/198)

Persistence Core chain using Starship to test chain upgrades. (Run in CI/CD)

## Examples

### [CosmJS based e2e testing](https://github.com/hyperweb-io/starship/tree/main/examples/osmojs)

Setup chain multiple chains, write e2e tests for governance, staking and osmosis specific txns.
Run tests with JS using CosmJS.
Run tests with Golang
### [Chain Upgrade E2E test](https://github.com/hyperweb-io/starship/tree/main/examples/upgrade-test)

Setup chain with cosmovisor setup with different chain version binaries.
Run tests with Golang
### [Multi chain setup](https://github.com/hyperweb-io/starship/blob/main/examples/multi-chain/config.yaml)

Multi chain setup with 3 chains, 2 relayers between the chain, explorer and registry
