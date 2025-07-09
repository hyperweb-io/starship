import { Relayer, StarshipConfig } from '@starship-ci/types';
import { ConfigMap, Container, StatefulSet, Volume } from 'kubernetesjs';

import * as helpers from '../../helpers';
import { IGenerator } from '../../types';
import { getGeneratorVersion } from '../../version';
import { BaseRelayerBuilder } from './base';

/**
 * ConfigMap generator for TS Relayer
 */
export class TsRelayerConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private relayer: Relayer;

  constructor(relayer: Relayer, config: StarshipConfig) {
    this.config = config;
    this.relayer = relayer;
  }

  generate(): Array<ConfigMap> {
    const metadata = {
      name: `${this.relayer.type}-${this.relayer.name}`,
      labels: {
        ...helpers.getCommonLabels(this.config),
        'app.kubernetes.io/component': 'relayer',
        'app.kubernetes.io/part-of': 'starship',
        'app.kubernetes.io/role': this.relayer.type,
        'app.kubernetes.io/name': `${this.relayer.type}-${this.relayer.name}`
      }
    };

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata,
        data: {
          'app.yaml': this.generateAppConfig(),
          'registry.yaml': this.generateRegistryConfig()
        }
      }
    ];
  }

  private generateAppConfig(): string {
    const relayerConfig = this.relayer.config || {};
    const globalConfig = relayerConfig.global || {};

    const chains: any = {};
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not found in configuration`);
      }

      const chainName = helpers.getChainName(String(chain.id));
      const chainConfig =
        relayerConfig.chains?.find((c: any) => c.id === chainId) || {};

      chains[chainId] = {
        chain_id: chainId,
        rpc: [
          `http://${chainName}-genesis.$(NAMESPACE).svc.cluster.local:26657`
        ],
        rest: [
          `http://${chainName}-genesis.$(NAMESPACE).svc.cluster.local:1317`
        ],
        chain_name: chain.name,
        pretty_name: chainConfig.pretty_name || chain.name,
        prefix: chain.prefix,
        denom: chain.denom,
        decimals: chainConfig.decimals || 6,
        gas_price: chainConfig.gas_price || '0.01',
        hd_path: chain.hdPath || "m/44'/118'/0'/0/0"
      };
    });

    const appConfig: {
      global: Record<string, any>;
      chains: Record<string, any>;
      cl: Array<{
        src: {
          chain_id: string;
          connection_id: string;
          channel_id: string;
          port_id: string;
        };
        dst: {
          chain_id: string;
          connection_id: string;
          channel_id: string;
          port_id: string;
        };
        new_connection: boolean;
        order: string;
      }>;
    } = {
      global: {
        api_port: globalConfig.api_port || 3000,
        timeout: globalConfig.timeout || 10000,
        memo: globalConfig.memo || '',
        ...globalConfig
      },
      chains,
      cl: []
    };

    if (this.relayer.channels && this.relayer.channels.length > 0) {
      this.relayer.channels.forEach((channel) => {
        appConfig.cl.push({
          src: {
            chain_id: channel['a-chain'],
            connection_id: channel['a-connection'] || '',
            channel_id: '', // Will be filled during channel creation
            port_id: channel['a-port']
          },
          dst: {
            chain_id: channel['b-chain'] || '',
            connection_id: '', // Will be filled during connection creation
            channel_id: '', // Will be filled during channel creation
            port_id: channel['b-port']
          },
          new_connection: channel['new-connection'] || false,
          order: channel.order || 'unordered'
        });
      });
    }

    return `# TS Relayer Configuration
${Object.entries(appConfig)
  .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
  .join('\n\n')}`;
  }

  private generateRegistryConfig(): string {
    const chains: any[] = [];

    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not found in configuration`);
      }

      const chainName = helpers.getChainName(String(chain.id));
      const chainConfig =
        this.relayer.config?.chains?.find((c: any) => c.id === chainId) || {};

      chains.push({
        chain_name: chain.name,
        chain_id: chainId,
        pretty_name: chainConfig.pretty_name || chain.name,
        status: 'live',
        network_type: 'testnet',
        bech32_prefix: chain.prefix,
        daemon_name: chain.binary || 'gaiad',
        node_home: chainConfig.node_home || '$HOME/.gaia',
        key_algos: ['secp256k1'],
        slip44: chainConfig.slip44 || 118,
        fees: {
          fee_tokens: [
            {
              denom: chain.denom,
              fixed_min_gas_price: chainConfig.gas_price || 0.01,
              low_gas_price: chainConfig.gas_price || 0.01,
              average_gas_price: chainConfig.gas_price || 0.01,
              high_gas_price: chainConfig.gas_price || 0.01
            }
          ]
        },
        staking: {
          staking_tokens: [
            {
              denom: chain.denom
            }
          ]
        },
        codebase: {
          git_repo: chainConfig.git_repo || '',
          recommended_version: chainConfig.version || '',
          compatible_versions: chainConfig.compatible_versions || [],
          genesis: {
            genesis_url: chainConfig.genesis_url || ''
          }
        },
        apis: {
          rpc: [
            {
              address: `http://${chainName}-genesis.$(NAMESPACE).svc.cluster.local:26657`,
              provider: 'starship'
            }
          ],
          rest: [
            {
              address: `http://${chainName}-genesis.$(NAMESPACE).svc.cluster.local:1317`,
              provider: 'starship'
            }
          ]
        },
        explorers: []
      });
    });

    return `# Chain Registry Configuration
chains:
${chains
  .map(
    (chain) =>
      `  - ${Object.entries(chain)
        .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 4)}`)
        .join('\n    ')}`
  )
  .join('\n')}`;
  }
}

/**
 * StatefulSet generator for TS Relayer
 */
export class TsRelayerStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private relayer: Relayer;

  constructor(relayer: Relayer, config: StarshipConfig) {
    this.config = config;
    this.relayer = relayer;
  }

  generate(): Array<StatefulSet> {
    const fullname = `${this.relayer.type}-${this.relayer.name}`;

    return [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
          name: fullname,
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'relayer',
            'app.kubernetes.io/part-of': 'starship',
            'app.kubernetes.io/role': this.relayer.type,
            'app.kubernetes.io/name': fullname
          }
        },
        spec: {
          serviceName: fullname,
          replicas: this.relayer.replicas || 1,
          podManagementPolicy: 'Parallel',
          revisionHistoryLimit: 3,
          selector: {
            matchLabels: {
              'app.kubernetes.io/instance': 'relayer',
              'app.kubernetes.io/type': this.relayer.type,
              'app.kubernetes.io/name': fullname
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
                'app.kubernetes.io/instance': 'relayer',
                'app.kubernetes.io/type': this.relayer.type,
                'app.kubernetes.io/name': fullname,
                'app.kubernetes.io/rawname': this.relayer.name,
                'app.kubernetes.io/version': getGeneratorVersion()
              }
            },
            spec: {
              initContainers: this.generateInitContainers(),
              containers: this.generateContainers(),
              volumes: this.generateVolumes()
            }
          }
        }
      }
    ];
  }

  private generateInitContainers(): Container[] {
    const initContainers: Container[] = [];

    // Add single wait init container for all chains
    const exposerPort = this.config.exposer?.ports?.rest || 8081;
    initContainers.push(
      helpers.generateWaitInitContainer(
        this.relayer.chains,
        exposerPort,
        this.config
      )
    );

    // Add ts-relayer init container
    initContainers.push(this.generateTsRelayerInitContainer());

    return initContainers;
  }

  private generateTsRelayerInitContainer(): Container {
    const image =
      this.relayer.image || 'ghcr.io/cosmology-tech/starship/ts-relayer:0.9.0';
    const env = [
      { name: 'KEYS_CONFIG', value: '/keys/keys.json' },
      { name: 'RELAYER_DIR', value: '/root/.ts-relayer' },
      { name: 'RELAYER_INDEX', value: '${HOSTNAME##*-}' },
      {
        name: 'NAMESPACE',
        valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } }
      }
    ];

    const command = this.generateTsRelayerInitCommand();

    return {
      name: 'init-relayer',
      image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env,
      command: ['bash', '-c'],
      args: [command],
      resources: helpers.getResourceObject(
        this.relayer.resources || { cpu: '0.2', memory: '200M' }
      ),
      volumeMounts: [
        { mountPath: '/root', name: 'relayer' },
        { mountPath: '/configs', name: 'relayer-config' },
        { mountPath: '/keys', name: 'keys' },
        { mountPath: '/scripts', name: 'scripts' }
      ]
    };
  }

  private generateContainers(): Container[] {
    const containers: Container[] = [];

    // Main ts-relayer container
    containers.push({
      name: 'relayer',
      image:
        this.relayer.image ||
        'ghcr.io/cosmology-tech/starship/ts-relayer:0.9.0',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [{ name: 'RELAYER_DIR', value: '/root/.ts-relayer' }],
      command: ['bash', '-c'],
      args: [
        'RLY_INDEX=${HOSTNAME##*-}\necho "Relayer Index: $RLY_INDEX"\nts-relayer start'
      ],
      resources: helpers.getResourceObject(
        this.relayer.resources || { cpu: '0.2', memory: '200M' }
      ),
      securityContext: {
        allowPrivilegeEscalation: false,
        runAsUser: 0
      },
      volumeMounts: [
        { mountPath: '/root', name: 'relayer' },
        { mountPath: '/configs', name: 'relayer-config' }
      ]
    });

    return containers;
  }

  private generateVolumes(): Volume[] {
    return [
      { name: 'relayer', emptyDir: {} },
      {
        name: 'relayer-config',
        configMap: { name: `${this.relayer.type}-${this.relayer.name}` }
      },
      { name: 'keys', configMap: { name: 'keys' } },
      { name: 'scripts', configMap: { name: 'setup-scripts' } }
    ];
  }

  private generateTsRelayerInitCommand(): string {
    let command = `set -ux

RLY_INDEX=\${HOSTNAME##*-}
echo "Relayer Index: $RLY_INDEX"

mkdir -p $RELAYER_DIR
cp /configs/app.yaml $RELAYER_DIR/
cp /configs/registry.yaml $RELAYER_DIR/

MNEMONIC=$(jq -r ".relayers[$RLY_INDEX].mnemonic" $KEYS_CONFIG)

`;

    // Add key creation and funding for each chain
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) return;

      const chainName = helpers.getChainName(String(chain.id));
      command += `
echo "Creating key for ${chainId}..."
echo "$MNEMONIC" | ts-relayer keys restore ${chainId} --hd-path "${chain.hdPath || "m/44'/118'/0'/0/0"}"

DENOM="${chain.denom}"
RLY_ADDR=$(ts-relayer keys show ${chainId})

echo "Transfer tokens to address $RLY_ADDR"
bash -e /scripts/transfer-tokens.sh \\
  $RLY_ADDR \\
  $DENOM \\
  http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:8000/credit \\
  "${chain.faucet?.enabled || false}" || true
`;
    });

    // Add channel creation if specified
    if (this.relayer.channels && this.relayer.channels.length > 0) {
      this.relayer.channels.forEach((channel) => {
        if (channel['new-connection']) {
          command += `
echo "Creating client, connection and channel..."
ts-relayer tx link ${channel['a-chain']} ${channel['b-chain']} \\
  --src-port ${channel['a-port']} \\
  --dst-port ${channel['b-port']} \\
  ${channel.order ? `--order ${channel.order}` : ''}
`;
        } else {
          command += `
echo "Creating channel..."
ts-relayer tx channel ${channel['a-chain']} ${channel['b-chain']} \\
  --src-port ${channel['a-port']} \\
  --dst-port ${channel['b-port']} \\
  ${channel.order ? `--order ${channel.order}` : ''}
`;
        }
      });
    }

    return command;
  }
}

/**
 * Main TS Relayer builder
 */
export class TsRelayerBuilder extends BaseRelayerBuilder {
  constructor(relayer: Relayer, config: StarshipConfig) {
    super(relayer, config);
    this.generators = [
      new TsRelayerConfigMapGenerator(relayer, config),
      new TsRelayerStatefulSetGenerator(relayer, config)
    ];
  }
}
