import { Chain, FaucetConfig, StarshipConfig } from '@starship-ci/types';
import { Container, StatefulSet } from 'kubernetesjs';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { ScriptManager } from '../../../scripts';
import { IGenerator } from '../../../types';
import { getGeneratorVersion } from '../../../version';

export class CosmosGenesisStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;
  private defaultsManager: DefaultsManager;

  constructor(
    chain: Chain,
    config: StarshipConfig,
    scriptManager: ScriptManager
  ) {
    this.config = config;
    this.chain = chain;
    this.scriptManager = scriptManager;
    this.defaultsManager = new DefaultsManager();
  }

  labels(): Record<string, string> {
    const processedChain = this.defaultsManager.processChain(this.chain);
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/part-of': helpers.getChainId(processedChain),
      'app.kubernetes.io/id': helpers.getChainId(processedChain),
      'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-genesis`,
      'app.kubernetes.io/type': `${helpers.getChainId(processedChain)}-statefulset`,
      'app.kubernetes.io/role': 'genesis',
      'starship.io/chain-name': processedChain.name
    };
  }

  generate(): Array<StatefulSet> {
    const processedChain = this.defaultsManager.processChain(this.chain);

    return [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
          name: `${helpers.getHostname(processedChain)}-genesis`,
          labels: this.labels()
        },
        spec: {
          serviceName: `${helpers.getHostname(processedChain)}-genesis`,
          replicas: 1,
          revisionHistoryLimit: 3,
          selector: {
            matchLabels: {
              'app.kubernetes.io/instance': this.config.name,
              'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-genesis`
            }
          },
          template: {
            metadata: {
              annotations: {
                quality: 'release',
                role: 'api-gateway',
                sla: 'high',
                tier: 'gateway'
              },
              labels: {
                'app.kubernetes.io/instance': this.config.name,
                'app.kubernetes.io/type': helpers.getChainId(processedChain),
                'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-genesis`,
                'app.kubernetes.io/rawname': helpers.getChainId(processedChain),
                'app.kubernetes.io/version': getGeneratorVersion(),
                'app.kubernetes.io/role': 'genesis'
              }
            },
            spec: {
              ...((processedChain as any).imagePullSecrets
                ? helpers.generateImagePullSecrets(
                    (processedChain as any).imagePullSecrets
                  )
                : {}),
              initContainers: this.createInitContainers(processedChain),
              containers: this.createMainContainers(processedChain),
              volumes: helpers.generateChainVolumes(processedChain)
            }
          }
        }
      }
    ];
  }

  private createInitContainers(chain: Chain): Container[] {
    const initContainers: Container[] = [];
    const exposerPort = this.config.exposer?.ports?.rest || 8081;

    // Build images init container if needed
    if (chain.build?.enabled || chain.upgrade?.enabled) {
      initContainers.push(this.createBuildImagesInitContainer(chain));
    }

    // Genesis init container
    initContainers.push(this.createGenesisInitContainer(chain));

    // Config init container
    initContainers.push(this.createConfigInitContainer(chain));

    // Add additional init containers based on chain configuration
    if (chain.faucet?.enabled && chain.faucet.type === 'starship') {
      initContainers.push(this.createFaucetInitContainer(chain));
    }

    if (chain.ics?.enabled) {
      // Add wait container for provider chain
      const providerChainId = chain.ics.provider || 'cosmoshub';
      initContainers.push(
        this.createIcsWaitInitContainer([providerChainId], exposerPort)
      );
      initContainers.push(this.createIcsInitContainer(chain, exposerPort));
    }

    return initContainers;
  }

  private createMainContainers(chain: Chain): Container[] {
    const containers: Container[] = [];

    // Main validator container
    containers.push(this.createValidatorContainer(chain));

    // Exposer container
    containers.push(this.createExposerContainer(chain));

    // Faucet container if enabled
    if (chain.faucet?.enabled) {
      containers.push(this.createFaucetContainer(chain));
    }

    return containers;
  }

  private createBuildImagesInitContainer(chain: Chain): Container {
    const buildCommands = [
      '# Install cosmovisor',
      'go install github.com/cosmos/cosmos-sdk/cosmovisor/cmd/cosmovisor@v1.0.0',
      '',
      '# Build genesis'
    ];

    if (chain.upgrade?.enabled) {
      // Build genesis version
      buildCommands.push(
        `UPGRADE_NAME=genesis CODE_TAG=${chain.upgrade.genesis} bash -e /scripts/build-chain.sh`
      );

      // Build upgrade versions
      if (chain.upgrade.upgrades) {
        chain.upgrade.upgrades.forEach((upgrade: any) => {
          buildCommands.push(
            `UPGRADE_NAME=${upgrade.name} CODE_TAG=${upgrade.version} bash -e /scripts/build-chain.sh`
          );
        });
      }
    } else if (chain.build?.enabled) {
      buildCommands.push(
        `UPGRADE_NAME=genesis CODE_TAG=${chain.build.source} bash -e /scripts/build-chain.sh`
      );
    }

    return {
      name: 'init-build-images',
      image: 'ghcr.io/cosmology-tech/starship/builder:latest',
      imagePullPolicy: 'IfNotPresent',
      command: ['bash', '-c', buildCommands.join('\n')],
      env: [
        { name: 'CODE_REF', value: chain.repo },
        { name: 'UPGRADE_DIR', value: `${chain.home}/cosmovisor` },
        { name: 'GOBIN', value: '/go/bin' },
        { name: 'CHAIN_NAME', value: helpers.getChainId(chain) },
        ...helpers.getDefaultEnvVars(chain)
      ],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createGenesisInitContainer(chain: Chain): Container {
    return {
      name: 'init-genesis',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        {
          name: 'FAUCET_ENABLED',
          value: String(chain.faucet?.enabled || false)
        },
        {
          name: 'NUM_VALIDATORS',
          value: String(chain.numValidators || 1)
        },
        {
          name: 'NUM_RELAYERS',
          value: String(this.config.relayers?.length || 0)
        }
      ],
      command: ['bash', '-c', this.getGenesisInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createConfigInitContainer(chain: Chain): Container {
    return {
      name: 'init-config',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'METRICS', value: String(chain.metrics) }
      ],
      command: ['bash', '-c', this.getConfigInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [
        ...helpers.generateChainVolumeMounts(chain),
        ...(chain.genesis
          ? [
              {
                mountPath: '/patch',
                name: 'patch'
              }
            ]
          : [])
      ]
    };
  }

  private createFaucetInitContainer(chain: Chain): Container {
    return {
      name: 'init-faucet',
      image: chain.faucet!.image,
      imagePullPolicy: 'IfNotPresent',
      command: [
        'bash',
        '-c',
        'cp /bin/faucet /faucet/faucet && chmod +x /faucet/faucet'
      ],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [{ mountPath: '/faucet', name: 'faucet' }]
    };
  }

  private createIcsInitContainer(chain: Chain, exposerPort: number): Container {
    // Need to get provider chain info - for now using a placeholder
    // In real implementation, this would need access to provider chain config
    const providerChainId = chain.ics?.provider || 'cosmoshub';
    const providerChain = this.config.chains.find(
      (c) => c.id === providerChainId
    );

    return {
      name: 'init-ics',
      image: providerChain?.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        {
          name: 'NAMESPACE',
          valueFrom: {
            fieldRef: {
              fieldPath: 'metadata.namespace'
            }
          }
        },
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' }
      ],
      command: [
        'bash',
        '-c',
        this.getIcsInitScript(chain, providerChain, exposerPort)
      ],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [
        { mountPath: '/proposal', name: 'proposal' },
        { mountPath: chain.home, name: 'node' },
        { mountPath: '/configs', name: 'addresses' },
        { mountPath: '/scripts', name: 'scripts' }
      ]
    };
  }

  private createIcsWaitInitContainer(
    chainIDs: string[],
    port: number
  ): Container {
    return helpers.generateWaitInitContainer(chainIDs, port, this.config);
  }

  private createValidatorContainer(chain: Chain): Container {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    return {
      name: 'validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        {
          name: 'FAUCET_ENABLED',
          value: String(chain.faucet?.enabled || false)
        },
        { name: 'SLOGFILE', value: 'slog.slog' },
        ...(toBuild
          ? [
              {
                name: 'DAEMON_NAME',
                value: chain.binary || helpers.getChainId(chain)
              },
              {
                name: 'DAEMON_HOME',
                value:
                  chain.home || `/home/validator/.${helpers.getChainId(chain)}`
              }
            ]
          : []),
        ...(chain.env || []).map((env: any) => ({
          name: env.name,
          value: String(env.value)
        }))
      ],
      command: ['bash', '-c', this.getValidatorStartScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain),
      ...(chain.cometmock?.enabled
        ? {}
        : {
            readinessProbe: chain.readinessProbe || {
              exec: {
                command: [
                  'bash',
                  '-e',
                  '/scripts/chain-rpc-ready.sh',
                  'http://localhost:26657'
                ]
              },
              initialDelaySeconds: 10,
              periodSeconds: 10,
              timeoutSeconds: 15
            }
          })
    };
  }

  private createExposerContainer(chain: Chain): Container {
    return {
      name: 'exposer',
      image:
        this.config.exposer?.image ||
        'ghcr.io/cosmology-tech/starship/exposer:latest',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'EXPOSER_HTTP_PORT', value: '8081' },
        { name: 'EXPOSER_GRPC_PORT', value: '9099' },
        {
          name: 'EXPOSER_GENESIS_FILE',
          value: `${chain.home}/config/genesis.json`
        },
        { name: 'EXPOSER_MNEMONIC_FILE', value: '/configs/keys.json' },
        {
          name: 'EXPOSER_PRIV_VAL_FILE',
          value: `${chain.home}/config/priv_validator_key.json`
        },
        {
          name: 'EXPOSER_NODE_KEY_FILE',
          value: `${chain.home}/config/node_key.json`
        },
        {
          name: 'EXPOSER_NODE_ID_FILE',
          value: `${chain.home}/config/node_id.json`
        },
        {
          name: 'EXPOSER_PRIV_VAL_STATE_FILE',
          value: `${chain.home}/data/priv_validator_state.json`
        }
      ],
      command: ['exposer'],
      resources: helpers.getResourceObject(
        this.config.exposer?.resources || { cpu: '0.1', memory: '128M' }
      ),
      volumeMounts: [
        { mountPath: chain.home, name: 'node' },
        { mountPath: '/configs', name: 'addresses' }
      ]
    };
  }

  private createFaucetContainer(chain: Chain): Container {
    if (chain.faucet?.type === 'cosmjs') {
      return this.createCosmjsFaucetContainer(chain);
    }
    return this.createStarshipFaucetContainer(chain);
  }

  private createCosmjsFaucetContainer(chain: Chain): Container {
    const faucet = chain.faucet as FaucetConfig;
    return {
      name: 'faucet',
      image:
        faucet.image ||
        this.config.faucet?.image ||
        'ghcr.io/cosmology-tech/starship/faucet:latest',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        {
          name: 'FAUCET_CONCURRENCY',
          value: String(faucet.concurrency || 1)
        },
        {
          name: 'FAUCET_PORT',
          value: String(faucet.ports?.rest || 8000)
        },
        { name: 'FAUCET_MEMO', value: 'faucet txn' },
        { name: 'FAUCET_GAS_PRICE', value: `1.25${chain.denom}` },
        { name: 'FAUCET_GAS_LIMIT', value: '2000000' },
        { name: 'FAUCET_ADDRESS_PREFIX', value: chain.prefix },
        { name: 'FAUCET_REFILL_FACTOR', value: '8' },
        { name: 'FAUCET_REFILL_THRESHOLD', value: '20' },
        { name: 'FAUCET_COOLDOWN_TIME', value: '0' },
        {
          name: 'COINS',
          value: chain.coins || `1000000000000000000${chain.denom}`
        },
        { name: 'HD_PATH', value: chain.hdPath || "m/44'/118'/0'/0/0" }
      ],
      command: ['bash', '-c', this.getCosmjsFaucetScript()],
      resources: helpers.getResourceObject(
        faucet.resources || { cpu: '0.2', memory: '200M' }
      ),
      volumeMounts: [
        { mountPath: '/configs', name: 'addresses' },
        { mountPath: '/scripts', name: 'scripts' }
      ],
      readinessProbe: {
        httpGet: {
          path: '/status',
          port: String(faucet.ports?.rest || 8000)
        },
        initialDelaySeconds: 30,
        periodSeconds: 10
      }
    };
  }

  private createStarshipFaucetContainer(chain: Chain): Container {
    const faucet = chain.faucet as FaucetConfig;
    return {
      name: 'faucet',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        {
          name: 'FAUCET_CONCURRENCY',
          value: String(faucet.concurrency || 1)
        },
        {
          name: 'FAUCET_HTTP_PORT',
          value: String(faucet.ports?.rest || 8000)
        },
        {
          name: 'FAUCET_CHAIN_BINARY',
          value: chain.binary || helpers.getChainId(chain)
        },
        { name: 'FAUCET_CHAIN_ID', value: helpers.getChainId(chain) },
        {
          name: 'COINS',
          value: chain.coins || `1000000000000000000${chain.denom}`
        }
      ],
      command: ['bash', '-c', this.getStarshipFaucetScript()],
      resources: helpers.getResourceObject(
        faucet.resources || { cpu: '0.1', memory: '128M' }
      ),
      volumeMounts: [
        { mountPath: '/configs', name: 'addresses' },
        { mountPath: '/faucet', name: 'faucet' },
        { mountPath: '/scripts', name: 'scripts' }
      ],
      readinessProbe: {
        httpGet: {
          path: '/status',
          port: String(faucet.ports?.rest || 8000)
        },
        initialDelaySeconds: 30,
        periodSeconds: 10
      }
    };
  }

  private getGenesisInitScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    let script = `
VAL_INDEX=\${HOSTNAME##*-}
echo "Validator Index: $VAL_INDEX"
`;

    // Add build binary copying logic if needed
    if (toBuild) {
      script += `
cp $CHAIN_DIR/cosmovisor/genesis/bin/$CHAIN_BIN /usr/bin
`;
    }

    script += `
if [ -f $CHAIN_DIR/config/genesis.json ]; then
  echo "Genesis file exists, exiting init container"
  exit 0
fi

echo "Running setup genesis script..."
bash -e /scripts/create-genesis.sh
bash -e /scripts/update-genesis.sh

echo "Create node id json file"
NODE_ID=$($CHAIN_BIN tendermint show-node-id)
echo '{"node_id":"'$NODE_ID'"}' > $CHAIN_DIR/config/node_id.json

echo "Create consensus key json file"
$CHAIN_BIN tendermint show-validator > $CHAIN_DIR/config/consensus_key.json
cat $CHAIN_DIR/config/consensus_key.json

echo "Add custom accounts and balances"
CHAIN_GENESIS_CMD=$($CHAIN_BIN 2>&1 | grep -q "genesis-related subcommands" && echo "genesis" || echo "")
`;

    // Add balances if configured
    if (chain.balances && chain.balances.length > 0) {
      chain.balances.forEach((balance: any) => {
        script += `
echo "Adding balance to ${balance.address}"
$CHAIN_BIN $CHAIN_GENESIS_CMD add-genesis-account ${balance.address} ${balance.amount} --keyring-backend="test"
`;
      });
    }

    return script.trim();
  }

  private getConfigInitScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    let script = `
VAL_INDEX=\${HOSTNAME##*-}
echo "Validator Index: $VAL_INDEX"
`;

    // Add build binary copying logic if needed
    if (toBuild) {
      script += `
cp $CHAIN_DIR/cosmovisor/genesis/bin/$CHAIN_BIN /usr/bin
`;
    }

    script += `
echo "Running setup config script..."
`;

    // Add genesis patching logic BEFORE config script (order matters!)
    if (chain.genesis && Object.keys(chain.genesis).length > 0) {
      script += `
jq -s '.[0] * .[1]' $CHAIN_DIR/config/genesis.json /patch/genesis.json > $CHAIN_DIR/config/genesis.json.tmp && mv $CHAIN_DIR/config/genesis.json.tmp $CHAIN_DIR/config/genesis.json
`;
    }

    script += `
bash -e /scripts/update-config.sh
`;

    return script.trim();
  }

  private getGenesisScript(chain: Chain): string {
    return this.scriptManager.getScriptContent(
      chain.scripts?.createGenesis || {
        name: 'create-genesis.sh',
        data: '/scripts/create-genesis.sh'
      }
    );
  }

  private getValidatorStartScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    return `#!/bin/bash
set -euo pipefail

START_ARGS=""
${chain.cometmock?.enabled ? `START_ARGS="--grpc-web.enable=false --transport=grpc --with-tendermint=false --address tcp://0.0.0.0:26658"` : ''}

${toBuild ? `/usr/bin/cosmovisor start $START_ARGS` : `$CHAIN_BIN start $START_ARGS`}`;
  }

  private getCosmjsFaucetScript(): string {
    return `
export FAUCET_TOKENS=$(printf '%s\\n' \${COINS//[[:digit:]]/})
for coin in \${COINS//,/ }
do
    var="FAUCET_CREDIT_AMOUNT_$(printf '%s\\n' \${coin//[[:digit:]]/} | tr '[:lower:]' '[:upper:]')"
    amt="\${coin//[!0-9]/}"

    if [ \${#amt} -gt 18 ]; then
      creditAmt=$(echo $amt | sed -e "s/000000$//")
      feesAmt=$(echo $amt | sed -e "s/0000000000000$//")
    else
      creditAmt=$(echo $amt | sed -e "s/0000$//")
      feesAmt=$(echo $amt | sed -e "s/00000000$//")
    fi

    export $var="$creditAmt"
done

export FAUCET_PATH_PATTERN="\${HD_PATH:0:$((\${#HD_PATH}-1))}a"
export FAUCET_MNEMONIC=$(jq -r ".faucet[0].mnemonic" /configs/keys.json)

echo "FAUCET_MNEMONIC: $FAUCET_MNEMONIC"
echo "FAUCET_PATH_PATTERN: $FAUCET_PATH_PATTERN"

export | grep "FAUCET"

until bash -e /scripts/chain-rpc-ready.sh http://localhost:26657; do
  sleep 10;
done

/app/packages/faucet/bin/cosmos-faucet-dist start "http://localhost:26657"
`.trim();
  }

  private getStarshipFaucetScript(): string {
    return `
CREDIT_COINS=""
FEES=""
for coin in \${COINS//,/ }
do
    amt="\${coin//[!0-9]/}"
    denom="\${coin//[0-9]/}"

    # Calculate the order of magnitude
    if [ \${#amt} -gt 18 ]; then
      creditAmt=$(echo $amt | sed -e "s/000000$//")
      feesAmt=$(echo $amt | sed -e "s/0000000000000$//")
    else
      creditAmt=$(echo $amt | sed -e "s/0000$//")
      feesAmt=$(echo $amt | sed -e "s/00000000$//")
    fi

    if [[ $CREDIT_COINS == "" ]]
    then
      CREDIT_COINS="$creditAmt$denom"
      FEES="$feesAmt$denom"
    else
      CREDIT_COINS="\${CREDIT_COINS},$creditAmt$denom"
    fi
done

export FAUCET_MNEMONIC=$(jq -r ".faucet[0].mnemonic" /configs/keys.json)

export | grep "FAUCET"

until bash -e /scripts/chain-rpc-ready.sh http://localhost:26657; do
  sleep 10
done

/faucet/faucet --credit-coins="$CREDIT_COINS" --chain-fees="$FEES"
`.trim();
  }

  private getIcsInitScript(
    chain: Chain,
    providerChain: Chain,
    exposerPort: number
  ): string {
    const providerHostname = helpers.getChainName(providerChain.id);
    return `
export

echo "Fetching priv keys from provider exposer"
curl -s http://${providerHostname}-genesis.$NAMESPACE.svc.cluster.local:${exposerPort}/priv_keys | jq > $CHAIN_DIR/config/provider_priv_validator_key.json
cat $CHAIN_DIR/config/provider_priv_validator_key.json

echo "Replace provider priv validator key with provider keys"
mv $CHAIN_DIR/config/priv_validator_key.json $CHAIN_DIR/config/previous_priv_validator_key.json
mv $CHAIN_DIR/config/provider_priv_validator_key.json $CHAIN_DIR/config/priv_validator_key.json

echo "Create consumer addition proposal"
DENOM=${providerChain?.denom} \\
  CHAIN_ID=${providerChain?.id} \\
  CHAIN_BIN=${providerChain?.binary || '$CHAIN_BIN'} \\
  NODE_URL=http://${providerHostname}-genesis.$NAMESPACE.svc.cluster.local:26657 \\
  PROPOSAL_FILE=/proposal/proposal.json \\
  bash -e /scripts/create-ics.sh

echo "create ccv state file"
${providerChain?.binary || '$CHAIN_BIN'} query provider consumer-genesis ${chain.id} \\
  --node http://${providerHostname}-genesis.$NAMESPACE.svc.cluster.local:26657 \\
  -o json > $CHAIN_DIR/config/ccv-state.json
cat $CHAIN_DIR/config/ccv-state.json | jq

echo "Update genesis file with ccv state"
jq -s '.[0].app_state.ccvconsumer = .[1] | .[0]' $CHAIN_DIR/config/genesis.json $CHAIN_DIR/config/ccv-state.json > $CHAIN_DIR/config/genesis-ccv.json
mv $CHAIN_DIR/config/genesis.json $CHAIN_DIR/config/genesis-no-ccv.json
mv $CHAIN_DIR/config/genesis-ccv.json $CHAIN_DIR/config/genesis.json
`.trim();
  }
}
