import { Chain, StarshipConfig } from '@starship-ci/types';
import { Container, Service, StatefulSet } from 'kubernetesjs';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { IGenerator, Manifest } from '../../../types';
import { getGeneratorVersion } from '../../../version';

/**
 * CometMock Service generator
 */
export class CometMockServiceGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
  }

  labels(): Record<string, string> {
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-cometmock`,
      'app.kubernetes.io/type': `${helpers.getChainId(this.chain)}-service`,
      'app.kubernetes.io/role': 'cometmock',
      'starship.io/chain-name': this.chain.name,
      'starship.io/chain-id': helpers.getChainId(this.chain)
    };
  }

  generate(): Array<Service> {
    if (!this.chain.cometmock?.enabled) {
      return [];
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${helpers.getHostname(this.chain)}-cometmock`,
          labels: this.labels()
        },
        spec: {
          clusterIP: 'None',
          ports: [
            {
              name: 'rpc',
              port: 22331,
              protocol: 'TCP',
              targetPort: '22331'
            }
          ],
          selector: {
            'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-cometmock`
          }
        }
      }
    ];
  }
}

/**
 * CometMock StatefulSet generator
 */
export class CometMockStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private defaultsManager: DefaultsManager;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
    this.defaultsManager = new DefaultsManager();
  }

  labels(): Record<string, string> {
    const processedChain = this.defaultsManager.processChain(this.chain);
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/part-of': helpers.getChainId(processedChain),
      'app.kubernetes.io/id': helpers.getChainId(processedChain),
      'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-cometmock`,
      'app.kubernetes.io/type': `${helpers.getChainId(processedChain)}-statefulset`,
      'app.kubernetes.io/role': 'cometmock',
      'starship.io/chain-name': processedChain.name
    };
  }

  generate(): Array<StatefulSet> {
    if (!this.chain.cometmock?.enabled) {
      return [];
    }

    const processedChain = this.defaultsManager.processChain(this.chain);

    return [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
          name: `${helpers.getHostname(processedChain)}-cometmock`,
          labels: this.labels()
        },
        spec: {
          serviceName: `${helpers.getHostname(processedChain)}-cometmock`,
          replicas: 1,
          revisionHistoryLimit: 3,
          selector: {
            matchLabels: {
              'app.kubernetes.io/instance': processedChain.name,
              'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-cometmock`
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
                'app.kubernetes.io/instance': processedChain.name,
                'app.kubernetes.io/type': 'cometmock',
                'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-cometmock`,
                'app.kubernetes.io/rawname': `${helpers.getChainId(processedChain)}-cometmock`,
                'app.kubernetes.io/version': getGeneratorVersion()
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

    // Add validator init container if numValidators > 1
    if (chain.numValidators && chain.numValidators > 1) {
      initContainers.push(this.createValidatorInitContainer(chain));
    }

    // Add wait init container
    initContainers.push(this.createWaitInitContainer(chain, exposerPort));

    // Add comet init container
    initContainers.push(this.createCometInitContainer(chain, exposerPort));

    return initContainers;
  }

  private createMainContainers(chain: Chain): Container[] {
    return [this.createCometContainer(chain)];
  }

  private createValidatorInitContainer(chain: Chain): Container {
    return {
      name: 'init-validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' }
      ],
      command: ['bash', '-c', this.getValidatorInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [
        { mountPath: '/chain', name: 'node' },
        { mountPath: '/scripts', name: 'scripts' },
        { mountPath: '/configs', name: 'addresses' }
      ]
    };
  }

  private createWaitInitContainer(chain: Chain, exposerPort: number): Container {
    return {
      name: 'init-wait',
      image: 'curlimages/curl',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        { name: 'GENESIS_PORT', value: String(exposerPort) },
        {
          name: 'NAMESPACE',
          valueFrom: {
            fieldRef: {
              fieldPath: 'metadata.namespace'
            }
          }
        }
      ],
      command: ['/bin/sh', '-c', this.getWaitInitScript(chain)],
      resources: helpers.getResourceObject(
        this.config.resources?.wait || { cpu: '0.1', memory: '100M' }
      )
    };
  }

  private createCometInitContainer(chain: Chain, exposerPort: number): Container {
    return {
      name: 'init-comet',
      image:
        chain.cometmock?.image ||
        'ghcr.io/informalsystems/cometmock:v0.37.x',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getGenesisEnvVars(chain, exposerPort),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {})
      ],
      command: ['bash', '-c', this.getCometInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [
        { mountPath: '/chain', name: 'node' },
        { mountPath: '/scripts', name: 'scripts' },
        { mountPath: '/configs', name: 'addresses' }
      ]
    };
  }

  private createCometContainer(chain: Chain): Container {
    const hasLifecycle = chain.numValidators && chain.numValidators > 1;

    return {
      name: 'comet',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getGenesisEnvVars(
          chain,
          this.config.exposer?.ports?.rest || 8081
        ),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' }
      ],
      command: ['bash', '-c', this.getCometContainerScript(chain)],
      ...(hasLifecycle
        ? {
            lifecycle: {
              postStart: {
                exec: {
                  command: ['bash', '-c', '-e', this.getCometPostStartScript(chain)]
                }
              }
            }
          }
        : {}),
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: [
        { mountPath: '/chain', name: 'node' },
        { mountPath: '/scripts', name: 'scripts' },
        { mountPath: '/configs', name: 'addresses' }
      ],
      readinessProbe: {
        httpGet: {
          path: '/status',
          port: '22331'
        },
        initialDelaySeconds: 10,
        periodSeconds: 10
      }
    };
  }

  private getValidatorInitScript(chain: Chain): string {
    if (!chain.numValidators || chain.numValidators <= 1) {
      return 'echo "No additional validators needed"';
    }

    const numValidators = chain.numValidators - 1; // Subtract 1 for genesis
    return `
for i in $(seq 0 ${numValidators - 1}); do
  mkdir -p /chain/validator-$i/config /chain/validator-$i/data
  VAL_KEY_NAME="$(jq -r '.validators[0].name' $KEYS_CONFIG)-$i"
  echo "Adding validator key.... $VAL_KEY_NAME"
  jq -r ".validators[0].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $VAL_KEY_NAME --index $i --recover --keyring-backend="test" --home /chain/validator-$i
done
    `.trim();
  }

  private getWaitInitScript(chain: Chain): string {
    const chainHostname = helpers.getHostname(chain);
    let script = `
while [ $(curl -sw '%{http_code}' http://${chainHostname}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys -o /dev/null) -ne 200 ]; do
  echo "Genesis validator does not seem to be ready for: ${helpers.getChainId(chain)}. Waiting for it to start..."
  echo "Checking: http://${chainHostname}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys"
  sleep 10;
done
    `;

    if (chain.numValidators && chain.numValidators > 1) {
      const numValidators = chain.numValidators - 1;
      script += `
for i in $(seq 0 ${numValidators - 1}); do
  while [ $(curl -sw '%{http_code}' http://${chainHostname}-validator-$i.${chainHostname}-validator.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys -o /dev/null) -ne 200 ]; do
    echo "Validator does not seem to be ready for: ${helpers.getChainId(chain)} validator-$i. Waiting for it to start..."
    echo "Checking: http://${chainHostname}-validator-$i.${chainHostname}-validator.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys"
    sleep 10;
  done
done
      `;
    }

    script += `
echo "Ready to start"
exit 0
    `;

    return script.trim();
  }

  private getCometInitScript(chain: Chain): string {
    const chainHostname = helpers.getHostname(chain);
    let script = `
mkdir -p /chain/genesis/config
mkdir -p /chain/genesis/data
curl http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/genesis -o /chain/genesis/config/genesis.json
echo "Genesis file that we got....."
cat /chain/genesis/config/genesis.json

## fetch priv_validator and priv_validator_state of all validators
curl http://$GENESIS_HOST.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys -o /chain/genesis/config/priv_validator_key.json
echo '{"height":"0","round":0,"step":0}' > /chain/genesis/data/priv_validator_state.json
    `;

    if (chain.numValidators && chain.numValidators > 1) {
      const numValidators = chain.numValidators - 1;
      script += `
for i in $(seq 0 ${numValidators - 1}); do
  mkdir -p /chain/validator-$i/config
  mkdir -p /chain/validator-$i/data
  curl http://${chainHostname}-validator-$i.${chainHostname}-validator.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_key -o /chain/validator-$i/config/node_key.json
  curl http://${chainHostname}-validator-$i.${chainHostname}-validator.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/priv_keys -o /chain/validator-$i/config/priv_validator_key.json
  echo '{"height":"0","round":0,"step":0}' > /chain/validator-$i/data/priv_validator_state.json
done
      `;
    }

    script += `
echo "copy cometmock binary to shared dir"
cp /usr/local/bin/cometmock /chain/cometmock
    `;

    return script.trim();
  }

  private getCometContainerScript(chain: Chain): string {
    const chainHostname = helpers.getHostname(chain);
    const blockTime = this.config.timeouts?.timeout_commit?.replace('ms', '') || '800';
    
    let script = `
NODE_LISTEN_ADDR_STR="tcp://${chainHostname}-genesis.$NAMESPACE.svc.cluster.local:26658"
NODE_HOME_STR="/chain/genesis"
    `;

    if (chain.numValidators && chain.numValidators > 1) {
      const numValidators = chain.numValidators - 1;
      script += `
for i in $(seq 0 ${numValidators - 1}); do
  NODE_LISTEN_ADDR_STR="tcp://${chainHostname}-validator-$i.${chainHostname}-validator.$NAMESPACE.svc.cluster.local:26658,$NODE_LISTEN_ADDR_STR"
  NODE_HOME_STR="/chain/validator-$i,$NODE_HOME_STR"
done
      `;
    }

    script += `
/chain/cometmock --block-time=${blockTime} $NODE_LISTEN_ADDR_STR /chain/genesis/config/genesis.json tcp://0.0.0.0:22331 $NODE_HOME_STR grpc
    `;

    return script.trim();
  }

  private getCometPostStartScript(chain: Chain): string {
    if (!chain.numValidators || chain.numValidators <= 1) {
      return 'echo "No additional validators to create"';
    }

    const numValidators = chain.numValidators - 1;
    return `
set -eux

sleep 10

for i in $(seq 0 ${numValidators - 1}); do
  $CHAIN_BIN keys list --keyring-backend test --home /chain/validator-$i --output json | jq
  VAL_KEY_NAME="$(jq -r '.validators[0].name' $KEYS_CONFIG)-$i"
  echo "Create validator.... $VAL_KEY_NAME"
  VAL_NAME=$VAL_KEY_NAME \\
    NODE_URL="http://0.0.0.0:22331" \\
    NODE_ARGS="--home /chain/validator-$i" \\
    GAS="1000000" \\
    bash -e /scripts/create-validator.sh
done
    `.trim();
  }
}

/**
 * Main CometMock generator
 * Orchestrates Service and StatefulSet generation for CometMock
 */
export class CometMockGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private generators: Array<IGenerator>;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
    this.generators = [];

    // Only create CometMock resources if enabled
    if (this.chain.cometmock?.enabled) {
      this.generators = [
        new CometMockServiceGenerator(this.chain, this.config),
        new CometMockStatefulSetGenerator(this.chain, this.config)
      ];
    }
  }

  generate(): Array<Manifest> {
    return this.generators.flatMap((generator) => generator.generate());
  }
} 