## Add new chain to Starship

This guide covers the process for adding a new chain to Starship.

### Step 1: Create docker image
Before we can get started with adding the chain, we need to create a docker image for the chain.
The docker image should contain the chain binary and some starship specific dependecies.

Dependencies required by starship (apart from chain binary):
- `curl`
- `make`
- `bash`
- `jq`
- `sed`

#### Starship docker system
We can either use the starship docker system to add the image.
Add a section to `starship/docker/chains/version.yaml`.
In chains add a section:
```yaml
- name: new-chain
  base: <base docker image>  # Used as base image from which chain binary are installed from `/bin` and `/lib` dir
  tags:
    - <tag>
```

By default we use the dockerfile in `starship/docker/chains/Dockerfile` to build the image.

If one wants to use a custom dockerfile, they can add a section to `starship/docker/chains/version.yaml`:
```yaml
- name: new-chain
  base: <base docker image>  # Used as base image from which chain binary are installed from `/bin` and `/lib` dir
  file: <path to custom dockerfile>
  tags:
    - <tag>
```

Then you can have your custom dockerfile in the path specified in `file`, which will be used to build the image.

Note we run the script: [`starship/docker/chains/build.sh`](https://github.com/hyperweb-io/starship/blob/main/starship/docker/chains/build-docker-chains.sh) to build the docker image.

Once this is done, please create a PR to the starship repo.
Once the PR is merged, our workflows will create and push the docker image to starship [ghcr registry](https://github.com/orgs/hyperweb-io/packages?repo_name=starship) of starship.  

#### Maintain own docker image
Optionally if you dont want to use the starship docker system, you can build the docker image and push it to a docker registry.
We just need the ability to access and download the docker image.
Make sure that the docker images are 

### Step 2: Add chain to helm chart

