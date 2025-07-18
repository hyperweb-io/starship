import { Chain, StarshipConfig } from '@starship-ci/types';
import { Container, StatefulSet } from 'kubernetesjs';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { ScriptManager } from '../../../scripts';
import { IGenerator } from '../../../types';
import { getGeneratorVersion } from '../../../version';

export class CosmosValidatorStatefulSetGenerator implements IGenerator {
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
      'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-validator`,
      'app.kubernetes.io/type': `${helpers.getChainId(processedChain)}-statefulset`,
      'app.kubernetes.io/role': 'validator',
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
          name: `${helpers.getHostname(processedChain)}-validator`,
          labels: this.labels()
        },
        spec: {
          serviceName: `${helpers.getHostname(processedChain)}-validator`,
          podManagementPolicy: 'Parallel',
          replicas: (processedChain.numValidators || 1) - 1,
          revisionHistoryLimit: 3,
          selector: {
            matchLabels: {
              'app.kubernetes.io/instance': this.config.name,
              'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-validator`
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
                'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-validator`,
                'app.kubernetes.io/version': getGeneratorVersion(),
                'app.kubernetes.io/role': 'validator'
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

    // Build images init container if needed
    if (chain.build?.enabled || chain.upgrade?.enabled) {
      initContainers.push(this.createBuildImagesInitContainer(chain));
    }

    // Wait for genesis node to be ready
    initContainers.push(this.createWaitInitContainer(chain));

    // Validator init container
    initContainers.push(this.createValidatorInitContainer(chain));

    // Validator config init container
    initContainers.push(this.createValidatorConfigContainer(chain));

    // ICS init container if enabled
    if (chain.ics?.enabled) {
      initContainers.push(this.createIcsInitContainer(chain));
    }

    return initContainers;
  }

  private createMainContainers(chain: Chain): Container[] {
    const containers: Container[] = [];

    // Main validator container
    containers.push(this.createValidatorContainer(chain));

    // Exposer container
    containers.push(this.createExposerContainer(chain));

    return containers;
  }

  private createWaitInitContainer(chain: Chain): Container {
    const exposerPort = this.config.exposer?.ports?.rest || 8081;
    return helpers.generateWaitInitContainer(
      [helpers.getChainId(chain)],
      exposerPort,
      this.config
    ) as Container;
  }

  private createIcsInitContainer(chain: Chain): Container {
    const providerChainId = chain.ics?.provider;
    const providerHostname = helpers.getChainName(providerChainId);
    const providerChain = this.config.chains.find(
      (c) => c.id === providerChainId
    );

    return {
      name: 'init-ics',
      image: providerChain?.image, // Should use provider chain image in real implementation
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
      command: ['bash', '-c', this.getIcsInitScript(chain, providerHostname)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
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

  private createValidatorInitContainer(chain: Chain): Container {
    return {
      name: 'init-validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        {
          name: 'FAUCET_ENABLED',
          value: String(chain.faucet?.enabled || false)
        },
        { name: 'METRICS', value: String(chain.metrics || false) }
      ],
      command: ['bash', '-c', this.getValidatorInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createValidatorConfigContainer(chain: Chain): Container {
    return {
      name: 'init-config',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'METRICS', value: String(chain.metrics || false) }
      ],
      command: ['bash', '-c', this.getValidatorConfigScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createValidatorContainer(chain: Chain): Container {
    return {
      name: 'validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'SLOGFILE', value: 'slog.slog' },
        ...(chain.env || []).map((env: any) => ({
          name: env.name,
          value: String(env.value)
        }))
      ],
      command: ['bash', '-c', this.getValidatorStartScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain),
      ...(chain.cometmock?.enabled || chain.ics?.enabled
        ? {}
        : {
            lifecycle: {
              postStart: {
                exec: {
                  command: [
                    'bash',
                    '-c',
                    '-e',
                    this.getValidatorPostStartScript(chain)
                  ]
                }
              }
            }
          }),
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
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
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

  private getIcsInitScript(chain: Chain, providerHostname: string): string {
    return `
VAL_INDEX=\${HOSTNAME##*-}
echo "Validator Index: $VAL_INDEX"

echo "Fetching priv keys from provider exposer"
curl -s http://${providerHostname}-validator-$VAL_INDEX.${providerHostname}-validator.$NAMESPACE.svc.cluster.local:8081/priv_keys | jq > $CHAIN_DIR/config/provider_priv_validator_key.json
cat $CHAIN_DIR/config/provider_priv_validator_key.json

echo "Replace provider priv validator key with provider keys"
mv $CHAIN_DIR/config/priv_validator_key.json $CHAIN_DIR/config/previous_priv_validator_key.json
mv $CHAIN_DIR/config/provider_priv_validator_key.json $CHAIN_DIR/config/priv_validator_key.json
`.trim();
  }

  private getValidatorInitScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    return `
VAL_INDEX=\${HOSTNAME##*-}
echo "Validator Index: $VAL_INDEX"
${toBuild ? 'cp $CHAIN_DIR/cosmovisor/genesis/bin/$CHAIN_BIN /usr/bin' : ''}

if [ -f $CHAIN_DIR/config/genesis.json ]; then
  echo "Genesis file exists, exiting early"
  exit 0
fi

VAL_NAME=$(jq -r ".validators[0].name" $KEYS_CONFIG)-$VAL_INDEX
echo "Validator Index: $VAL_INDEX, Key name: $VAL_NAME"

echo "Recover validator $VAL_NAME"
$CHAIN_BIN init $VAL_NAME --chain-id $CHAIN_ID
jq -r ".validators[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $VAL_NAME --index $VAL_INDEX --recover --keyring-backend="test"

curl http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/genesis -o $CHAIN_DIR/config/genesis.json
echo "Genesis file that we got....."
cat $CHAIN_DIR/config/genesis.json

echo "Create node id json file"
NODE_ID=$($CHAIN_BIN tendermint show-node-id)
echo '{"node_id":"'$NODE_ID'"}' > $CHAIN_DIR/config/node_id.json
`.trim();
  }

  private getValidatorConfigScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    return `
VAL_INDEX=\${HOSTNAME##*-}
echo "Validator Index: $VAL_INDEX"
${toBuild ? 'cp $CHAIN_DIR/cosmovisor/genesis/bin/$CHAIN_BIN /usr/bin' : ''}

echo "Running setup config script..."
bash -e /scripts/update-config.sh

curl -s http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id
NODE_ID=$(curl -s http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id | jq -r ".node_id")
if [[ $NODE_ID == "" ]]; then
  echo "Node ID is null, exiting early"
  exit 1
fi

GENESIS_NODE_P2P=$NODE_ID@$GENESIS_HOST.$NAMESPACE.svc.cluster.local:26656
echo "Node P2P: $GENESIS_NODE_P2P"
sed -i "s/persistent_peers = \\"\\"/persistent_peers = \\"$GENESIS_NODE_P2P\\"/g" $CHAIN_DIR/config/config.toml

echo "Printing the whole config.toml file"
cat $CHAIN_DIR/config/config.toml
`.trim();
  }

  private getValidatorStartScript(chain: Chain): string {
    const toBuild = chain.build?.enabled || chain.upgrade?.enabled;

    return `
set -eux
START_ARGS=""
${chain.cometmock?.enabled ? 'START_ARGS="--grpc-web.enable=false --transport=grpc --with-tendermint=false --address tcp://0.0.0.0:26658"' : ''}

# Starting the chain
${
  toBuild
    ? `
cp $CHAIN_DIR/cosmovisor/genesis/bin/$CHAIN_BIN /usr/bin
/usr/bin/cosmovisor start $START_ARGS`
    : `
$CHAIN_BIN start $START_ARGS`
}
`.trim();
  }

  private getValidatorPostStartScript(chain: Chain): string {
    return `
until bash -e /scripts/chain-rpc-ready.sh http://localhost:26657; do
  sleep 10
done

set -eux
export
VAL_INDEX=\${HOSTNAME##*-}
VAL_NAME="$(jq -r ".validators[0].name" $KEYS_CONFIG)-$VAL_INDEX"
echo "Validator Index: $VAL_INDEX, Key name: $VAL_NAME. Chain bin $CHAIN_BIN"

VAL_ADDR=$($CHAIN_BIN keys show $VAL_NAME -a --keyring-backend="test")
echo "Transfer tokens to address $VAL_ADDR before trying to create validator. Best effort"
bash -e /scripts/transfer-tokens.sh \\
  $VAL_ADDR \\
  $DENOM \\
  http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:8000/credit \\
  "${chain.faucet?.enabled || false}" || true

$CHAIN_BIN keys list --keyring-backend test | jq
VAL_NAME=$VAL_NAME bash -e /scripts/create-validator.sh
`.trim();
  }
}
