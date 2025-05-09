## 🚀 Adding a New Chain to Starship

Welcome, brave dev! Whether you're integrating a Cosmos SDK chain or
a custom chain into the Starship testing environment, this guide has
your back. We'll walk through setting up Docker images, Helm configuration,
and end-to-end testing—warp speed style.

### 🧱 Step 1: Build Your Docker Image
Starship launches testnets using Docker, so each chain needs a compatible image.

#### ✅ Required Dependencies
The Docker image must include:
* Your chain binary
* Standard Starship utilities:
  * `bash`
  * `curl`
  * `make`
  * `jq`
  * `sed`

You can either use Starship's Docker build system or maintain your own.

#### ✨ Option A: Use the Starship Docker System
Update [`starship/docker/chains/versions.yaml`](https://github.com/hyperweb-io/starship/blob/main/starship/docker/chains/versions.yaml) with your chain:
```yaml
- name: mychain
  base: <base docker image>  # Used as base image from which chain binary are installed from `/bin` and `/lib` dir
  tags:
    - <tag>
```

Want to use a custom Dockerfile? Add the file field:

```yaml
- name: mychain
  base: <base-docker-image>
  file: starship/docker/chains/Dockerfile.mychain
  tags:
  - v1.0.0
```

The default build script is [`build-docker-chains.sh`](https://github.com/hyperweb-io/starship/blob/main/starship/docker/chains/build-docker-chains.sh).
Once your PR is merged, GitHub Actions will automatically build and push the image to [Starship’s GHCR registry](https://github.com/orgs/hyperweb-io/packages?repo_name=starship).


#### 🛠️ Option B: Bring Your Own Docker Image
You can also build and host the Docker image yourself. Just make sure:
* It's public or accessible from the Starship test environment.
* It includes the required Starship dependencies.

### ⚙️ Step 2: Add Chain to Helm Chart
Update the chain config in [`starship/charts/defaults.yaml`](https://github.com/hyperweb-io/starship/blob/main/starship/charts/defaults.yaml)
under `defaultChains`.

Example: Adding Cosmos Hub
```yaml
defaultChains:
  ## add new chain to section
  ## ...
  cosmoshub:
  image: ghcr.io/cosmology-tech/starship/gaia:v18.0.0
  home: /root/.gaia
  binary: gaiad
  prefix: cosmos
  denom: uatom
  prettyName: Cosmos Hub
  coins: 100000000000000uatom
  hdPath: m/44'/118'/0'/0/0
  coinType: 118
  repo: https://github.com/cosmos/gaia
  assets:
    - base: uatom
      description: "The native staking and governance token of the Cosmos Hub."
      name: Cosmos Hub Atom
      display: atom
      symbol: ATOM
      logo_URIs:
        png: "https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png"
        svg: "https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg"
      denom_units:
        - denom: uatom
          exponent: 0
        - denom: atom
          exponent: 6
      coingecko_id: atom
```

#### Optional: Custom Scripts
Need special handling for genesis/config/validator etc?

Override default scripts like this:
```yaml
scripts:
  createGenesis:
    file: scripts/mychain/create-genesis.sh
```

Place them under:
`starship/charts/scripts/<chain-name>/<script>.sh`

#### Add chain name in Default Chains
Then update [`starship/charts/devnet/values.schema.json`](https://github.com/hyperweb-io/starship/blob/main/starship/charts/devnet/values.schema.json) to include your chain:
Add the chain name to [`.properties.chains.items.properties.name.enum`](https://github.com/hyperweb-io/starship/blob/main/starship/charts/devnet/values.schema.json#L119) array.

```json
 "enum": ["cosmoshub", "noble", "mychain"],
```

### 🧪 Step 3: Write an End-to-End Test

Tests live in [`starship/tests/e2e/configs`](https://github.com/hyperweb-io/starship/tree/main/starship/tests/e2e/configs).
Add a config:
```bash
touch starship/tests/e2e/configs/mychain.yaml
```

Use an existing chain config as a template. Then run:
```bash
cd starship/tests/e2e

make install HELM_FILE=configs/mychain.yaml

# Monitor pod startup
kubectl get pods
kubectl logs <pod-name> -f

make port-forward HELM_FILE=configs/mychain.yaml
make test HELM_FILE=configs/mychain.yaml
```

See [README.md](https://github.com/hyperweb-io/starship/blob/main/starship/tests/e2e/README.md) for advanced test instructions.

### 🚀 Step 4: Open a PR (or Two)
You’ve made it! Now open a PR to [hyperweb-io/starship](https://github.com/hyperweb-io/starship):
* PR #1: Docker image + build config
* PR #2: Helm + default values + tests

Or combine them in one if you're feeling adventurous.

## 📚 Example PRs that added some chains

* Noble Chain addition
  * Docker integration: https://github.com/hyperweb-io/starship/pull/574
  * Helm Chart updates: https://github.com/hyperweb-io/starship/pull/576
  * Test cases: https://github.com/hyperweb-io/starship/pull/581
* Kujira: https://github.com/hyperweb-io/starship/pull/508/files
* Agoric Chain: https://github.com/hyperweb-io/starship/pull/423/files
* XPLA Chain: With custom script: https://github.com/hyperweb-io/starship/pull/643/files

## 💡 Pro Tips
Keep commits atomic and readable.

Add clear commit messages and PR descriptions.
