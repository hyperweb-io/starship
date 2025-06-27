import { Chain, StarshipConfig } from '@starship-ci/types';
import { Container, StatefulSet } from 'kubernetesjs';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { ScriptManager } from '../../../scripts';
import { IGenerator, Manifest } from '../../../types';
import { getGeneratorVersion } from '../../../version';

export class CosmosGenesisStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;
  private defaultsManager: DefaultsManager;

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
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
      'app.kubernetes.io/name': `${helpers.getHostname(processedChain)}-genesis`,
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
                ? helpers.generateImagePullSecrets((processedChain as any).imagePullSecrets)
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
      command: ['bash', '-c', this.getGenesisScript(chain)],
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
        { name: 'METRICS', value: String(chain.metrics || false) }
      ],
      command: ['bash', '-c', '/scripts/update-config.sh'],
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
    return {
      name: 'init-ics',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        { name: 'EXPOSER_PORT', value: String(exposerPort) }
      ],
      command: [
        'bash',
        '-c',
        `echo "ICS initialization for consumer chain ${helpers.getChainId(chain)}"`
      ],
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
        {
          name: 'FAUCET_ENABLED',
          value: String(chain.faucet?.enabled || false)
        },
        { name: 'SLOGFILE', value: 'slog.slog' },
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
    const faucet = chain.faucet as any;
    return {
      name: 'faucet',
      image: faucet.image,
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
        {
          name: 'FAUCET_GAS_PRICE',
          value: faucet.gasPrice || '0.025'
        },
        {
          name: 'FAUCET_PATH_PATTERN',
          value: faucet.pathPattern || ''
        },
        { name: 'FAUCET_ADDRESS_PREFIX', value: chain.prefix },
        {
          name: 'FAUCET_TOKENS',
          value: faucet.tokens?.join(',') || chain.denom
        },
        {
          name: 'FAUCET_CREDIT_AMOUNT_SEND',
          value: String(faucet.creditAmount?.send || 10000000)
        },
        {
          name: 'FAUCET_CREDIT_AMOUNT_STAKE',
          value: String(faucet.creditAmount?.stake || 10000000)
        },
        {
          name: 'FAUCET_MAX_CREDIT',
          value: String(faucet.maxCredit || 99999999)
        },
        { name: 'FAUCET_MNEMONIC', value: faucet.mnemonic || '' },
        { name: 'FAUCET_CHAIN_ID', value: helpers.getChainId(chain) },
        {
          name: 'FAUCET_RPC_ENDPOINT',
          value: `http://localhost:${helpers.getPortMap().rpc}`
        }
      ],
      command: ['yarn', 'start'],
      resources: helpers.getResourceObject(
        faucet.resources || { cpu: '0.2', memory: '200M' }
      ),
      volumeMounts: [{ mountPath: '/configs', name: 'addresses' }]
    };
  }

  private createStarshipFaucetContainer(chain: Chain): Container {
    const faucet = chain.faucet as any;
    return {
      name: 'faucet',
      image: 'busybox:1.34.1',
      imagePullPolicy: 'IfNotPresent',
      env: [
        {
          name: 'FAUCET_CONCURRENCY',
          value: String(faucet.concurrency || 1)
        },
        {
          name: 'FAUCET_PORT',
          value: String(faucet.ports?.rest || 8000)
        },
        { name: 'FAUCET_CHAIN_ID', value: helpers.getChainId(chain) },
        { name: 'FAUCET_CHAIN_DENOM', value: chain.denom },
        { name: 'FAUCET_CHAIN_PREFIX', value: chain.prefix },
        {
          name: 'FAUCET_AMOUNT_SEND',
          value: String(faucet.creditAmount?.send || 10000000)
        },
        {
          name: 'FAUCET_AMOUNT_STAKE',
          value: String(faucet.creditAmount?.stake || 10000000)
        },
        {
          name: 'FAUCET_RPC_ENDPOINT',
          value: `http://localhost:${helpers.getPortMap().rpc}`
        },
        {
          name: 'FAUCET_REST_ENDPOINT',
          value: `http://localhost:${helpers.getPortMap().rest}`
        }
      ],
      command: ['sh', '-c', '/faucet/faucet'],
      resources: helpers.getResourceObject(
        faucet.resources || { cpu: '0.1', memory: '128M' }
      ),
      volumeMounts: [
        { mountPath: '/configs', name: 'addresses' },
        { mountPath: '/faucet', name: 'faucet' }
      ]
    };
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
    return `#!/bin/bash
set -euo pipefail

echo "Starting ${chain.binary} validator..."
exec ${chain.binary} start --home ${chain.home} --log_level info`;
  }
}
