# Injective dev environment
Infra setup for spinning up injective nodes with other cosmos nodes/chains, relayers and explorers

Starship runs by separating out the infra from the tests that are run against the infra.
In this repo we only spin up the infra, so tests can be run against this infra from RPC,gRPC endpoints in any language.

## Getting Started
### Setup script
In the `examples/injective` dir, run

```bash
make setup-deps ## Installs dependencies for Starship
```

### Manul install (alternate)
Alternatively to the setup script one can just install the deps directly:
* docker: https://docs.docker.com/get-docker/
* kubectl: https://kubernetes.io/docs/tasks/tools/
* kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
* helm: https://helm.sh/docs/intro/install/
* yq: https://github.com/mikefarah/yq/#install

## Connect to a kubernetes cluster
### Spinup local cluster
On Linux:
```bash
make setup-kind
```

On Mac:
Use Docker Desktop to setup kubernetes cluster: https://docs.docker.com/desktop/kubernetes/#turn-on-kubernetes

### Connect to a remote cluster (alternate)
If one has access to a k8s cluster via a `kubeconfig` file one can run Starship directly on the remote cluster.

## Check connection with cluster
Run
```bash
kubectl get nodes
```

## Spin up infra
Once the initial connection and setup is done, then one can spin up starship infra with

```bash
make install
# OR if you want to run specific config file
make install FILE=configs/devnet.yaml
```

Once the helm chart is installed, you will have to wait for pods to be in a `Running` state. Usually takes 3-5 mins depending on the resources available.
Can check with
```bash
kubectl get pods
```

When all pods are in `Running` state, run port-forwarding to access the nodes on localhost
```bash
make port-forward
# All exposed endpoints would be printed by this command
```

Now you can connect with the explorer and play around: `http://localhost:8080`

Once done, cleanup with:
```bash
make stop
```

## Configs
Starship configs is the definition of the infra we want to spin up.
Present in `configs/`, are multiple versions of the similar infra, tweaked to be able to run in different environments
* `configs/local.yaml`: Config file to be able to run locally
* `configs/devnet.yaml`: Supposed to be run on a larger k8s cluster, with more resources and number of validators
* `configs/ci.yaml`: Limited resources on the GH-Action runner, can be adapted for with reducing cpu,memory allocated

All the config files are similar topology, but different resources allocated.
Topology:
* 2 chains: `injective-1` (custom setup scripts) and `cosmoshub-4`
* 1 hermes relayer: running between the chains
* Registry service: analogous to cosmos chain-registry, but for only our infra
* Optionally explorer: ping-pub explorer for the mini cosmos

Details of each of arguments in the config file can be found [here](https://docs.cosmology.zone/starship/config/chains)

## Dir Structure
* `configs/`: Holds all the various config files and custom scripts for infra initialization
  * `configs/scripts/`: Custom scripts used by the config file for setup. More details [here](https://docs.cosmology.zone/starship/config/chains#scripts-optional)
  * `configs/*.yaml`: Various config files as described above
* `scripts/`: Handy scripts for dealing with starship setup and running
  * `scripts/dev-setup.sh`: Checks for dependencies
  * `scripts/port-forward.sh`: Performs local port-forwarding based on config file definitions
  * `scripts/install.sh`: Installs helm chart in a connected kubernetes cluster
* `Makefile`: Single entrypoint for Starship, has all commands needed
* `READMD.md`: Readme file
