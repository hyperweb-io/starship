import { Relayer, StarshipConfig } from '@starship-ci/types';
import { ConfigMap, Container, StatefulSet, Volume } from 'kubernetesjs';

import * as helpers from '../../helpers';
import { IGenerator } from '../../types';
import { getGeneratorVersion } from '../../version';
import { BaseRelayerBuilder } from './base';

/**
 * ConfigMap generator for Go Relayer
 */
export class GoRelayerConfigMapGenerator implements IGenerator {
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

    const data: Record<string, string> = {
      'path.json': this.generatePathConfig()
    };

    // Generate individual chain configs
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not found in configuration`);
      }
      data[`${chainId}.json`] = this.generateChainConfig(chainId, chain);
    });

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata,
        data
      }
    ];
  }

  private generatePathConfig(): string {
    const paths: Record<string, any> = {};

    if (this.relayer.channels && this.relayer.channels.length > 0) {
      this.relayer.channels.forEach((channel, index) => {
        const pathName = `path${index}`;
        paths[pathName] = {
          src: {
            'chain-id': channel['a-chain'],
            'client-id': '', // Will be filled during connection creation
            'connection-id': channel['a-connection'] || '',
            'channel-id': '', // Will be filled during channel creation
            'port-id': channel['a-port']
          },
          dst: {
            'chain-id': channel['b-chain'] || '',
            'client-id': '', // Will be filled during connection creation
            'connection-id': '', // Will be filled during connection creation
            'channel-id': '', // Will be filled during channel creation
            'port-id': channel['b-port']
          },
          'src-channel-filter': {
            rule: null,
            'channel-list': []
          }
        };
      });
    } else if (this.relayer.chains && this.relayer.chains.length >= 2) {
      // Generate a default path using the first two chains
      const srcChainId = this.relayer.chains[0];
      const dstChainId = this.relayer.chains[1];

      paths['path'] = {
        src: {
          'chain-id': srcChainId,
          'client-id': '', // Will be filled during connection creation
          'connection-id': '', // Will be filled during connection creation
          'channel-id': '', // Will be filled during channel creation
          'port-id': 'transfer'
        },
        dst: {
          'chain-id': dstChainId,
          'client-id': '', // Will be filled during connection creation
          'connection-id': '', // Will be filled during connection creation
          'channel-id': '', // Will be filled during channel creation
          'port-id': 'transfer'
        },
        'src-channel-filter': {
          rule: null,
          'channel-list': []
        }
      };
    }

    return JSON.stringify({ paths }, null, 2);
  }

  private generateChainConfig(chainId: string, chain: any): string {
    const chainName = helpers.getChainName(String(chain.id));
    const relayerConfig = this.relayer.config || {};
    const chainConfig =
      relayerConfig.chains?.find((c: any) => c.id === chainId) || {};

    const config = {
      type: 'cosmos',
      value: {
        key: chainId,
        'chain-id': chainId,
        'rpc-addr': `http://${chainName}-genesis.$(NAMESPACE).svc.cluster.local:26657`,
        'account-prefix': chainConfig.account_prefix || chain.prefix,
        'keyring-backend': 'test',
        'gas-adjustment': chainConfig.gas_adjustment || 1.2,
        'gas-prices': `${chainConfig.gas_prices || '0.01'}${chain.denom}`,
        'min-gas-amount': chainConfig.min_gas_amount || 0,
        debug: chainConfig.debug || false,
        timeout: chainConfig.timeout || '20s',
        'block-timeout': chainConfig.block_timeout || '',
        'output-format': 'json',
        'sign-mode': 'direct',
        'extra-codecs': chainConfig.extra_codecs || []
      }
    };

    return JSON.stringify(config, null, 2);
  }
}

/**
 * StatefulSet generator for Go Relayer
 */
export class GoRelayerStatefulSetGenerator implements IGenerator {
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

    // Add go-relayer init container
    initContainers.push(this.generateGoRelayerInitContainer());

    return initContainers;
  }

  private generateGoRelayerInitContainer(): Container {
    const image =
      this.relayer.image || 'ghcr.io/cosmology-tech/starship/go-relayer:v2.4.1';
    const env = [
      { name: 'KEYS_CONFIG', value: '/keys/keys.json' },
      { name: 'RELAYER_DIR', value: '/root/.relayer' },
      { name: 'RELAYER_INDEX', value: '${HOSTNAME##*-}' },
      {
        name: 'NAMESPACE',
        valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } }
      }
    ];

    const command = this.generateGoRelayerInitCommand();

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

    // Main go-relayer container
    containers.push({
      name: 'relayer',
      image:
        this.relayer.image ||
        'ghcr.io/cosmology-tech/starship/go-relayer:v2.4.1',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [{ name: 'RELAYER_DIR', value: '/root/.relayer' }],
      command: ['bash', '-c'],
      args: [
        'RLY_INDEX=${HOSTNAME##*-}\necho "Relayer Index: $RLY_INDEX"\nrly start'
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

  private generateGoRelayerInitCommand(): string {
    let command = `set -ux

RLY_INDEX=\${HOSTNAME##*-}
echo "Relayer Index: $RLY_INDEX"

mkdir -p $RELAYER_DIR/config
cp /configs/path.json $RELAYER_DIR/config/

MNEMONIC=$(jq -r ".relayers[$RLY_INDEX].mnemonic" $KEYS_CONFIG)

`;

    // Add chain configurations and key creation
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) return;

      const chainName = helpers.getChainName(String(chain.id));
      command += `
echo "Setting up chain ${chainId}..."
cp /configs/${chainId}.json $RELAYER_DIR/config/
rly chains add --file /configs/${chainId}.json ${chainId}

echo "Creating key for ${chainId}..."
echo "$MNEMONIC" | rly keys restore ${chainId} ${chainId} --restore-key-type secp256k1 --coin-type 118

DENOM="${chain.denom}"
RLY_ADDR=$(rly keys show ${chainId} ${chainId})

echo "Transfer tokens to address $RLY_ADDR"
bash -e /scripts/transfer-tokens.sh \\
  $RLY_ADDR \\
  $DENOM \\
  http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:8000/credit \\
  "${chain.faucet?.enabled || false}" || true
`;
    });

    // Add path setup and channel creation if specified
    if (this.relayer.channels && this.relayer.channels.length > 0) {
      command += `
echo "Adding paths..."
rly paths add --file /configs/path.json

`;

      this.relayer.channels.forEach((channel, index) => {
        const pathName = `path${index}`;
        if (channel['new-connection']) {
          command += `
echo "Creating client, connection and channel for ${pathName}..."
rly tx link ${pathName} --src-port ${channel['a-port']} --dst-port ${channel['b-port']}
`;
        } else {
          command += `
echo "Creating channel for ${pathName}..."
rly tx channel ${pathName} --src-port ${channel['a-port']} --dst-port ${channel['b-port']} ${channel.order ? `--order ${channel.order}` : ''}
`;
        }
      });
    }

    return command;
  }
}

/**
 * Main Go Relayer builder
 */
export class GoRelayerBuilder extends BaseRelayerBuilder {
  constructor(relayer: Relayer, config: StarshipConfig) {
    super(relayer, config);
    this.generators = [
      new GoRelayerConfigMapGenerator(relayer, config),
      new GoRelayerStatefulSetGenerator(relayer, config)
    ];
  }
}
