import { Relayer, StarshipConfig } from '@starship-ci/types';
import {
  ConfigMap,
  Container,
  EnvVar,
  Service,
  StatefulSet,
  Volume
} from 'kubernetesjs';

import * as helpers from '../../helpers';
import { IGenerator } from '../../types';
import { getGeneratorVersion } from '../../version';
import { BaseRelayerBuilder } from './base';

/**
 * ConfigMap generator for Neutron Query Relayer
 */
export class NeutronQueryConfigMapGenerator implements IGenerator {
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
          'config.json': this.generateNeutronQueryConfig()
        }
      }
    ];
  }

  private generateNeutronQueryConfig(): string {
    const relayerConfig = this.relayer.config || {};

    // Find the neutron chain (should be the first one typically)
    const neutronChainId =
      this.relayer.chains.find((chainId) => {
        const chain = this.config.chains.find((c) => String(c.id) === chainId);
        return chain?.name === 'neutron';
      }) || this.relayer.chains[0];

    const neutronChain = this.config.chains.find(
      (c) => String(c.id) === neutronChainId
    );
    if (!neutronChain) {
      throw new Error(
        `Neutron chain ${neutronChainId} not found in configuration`
      );
    }

    const neutronChainName = helpers.getChainName(String(neutronChain.id));

    // Find the target chain (should be the second one typically)
    const targetChainId =
      this.relayer.chains.find((chainId) => chainId !== neutronChainId) ||
      this.relayer.chains[1];
    const targetChain = this.config.chains.find(
      (c) => String(c.id) === targetChainId
    );
    if (!targetChain) {
      throw new Error(
        `Target chain ${targetChainId} not found in configuration`
      );
    }

    const targetChainName = helpers.getChainName(String(targetChain.id));

    const config = {
      relayer: {
        neutron_chain: {
          chain_id: neutronChainId,
          rpc_addr: `http://${neutronChainName}-genesis.$(NAMESPACE).svc.cluster.local:26657`,
          grpc_addr: `http://${neutronChainName}-genesis.$(NAMESPACE).svc.cluster.local:9090`,
          websocket_addr: `ws://${neutronChainName}-genesis.$(NAMESPACE).svc.cluster.local:26657/websocket`,
          account_prefix: neutronChain.prefix,
          keyring_backend: 'test',
          gas_prices: `${relayerConfig.neutron_gas_prices || '0.025'}${neutronChain.denom}`,
          gas_adjustment: relayerConfig.neutron_gas_adjustment || 1.5,
          connection_id: relayerConfig.neutron_connection_id || 'connection-0',
          debug: relayerConfig.debug || false,
          timeout: relayerConfig.timeout || '10s',
          tx_memo: relayerConfig.tx_memo || 'neutron-query-relayer'
        },
        target_chain: {
          chain_id: targetChainId,
          rpc_addr: `http://${targetChainName}-genesis.$(NAMESPACE).svc.cluster.local:26657`,
          grpc_addr: `http://${targetChainName}-genesis.$(NAMESPACE).svc.cluster.local:9090`,
          websocket_addr: `ws://${targetChainName}-genesis.$(NAMESPACE).svc.cluster.local:26657/websocket`,
          account_prefix: targetChain.prefix,
          keyring_backend: 'test',
          gas_prices: `${relayerConfig.target_gas_prices || '0.025'}${targetChain.denom}`,
          gas_adjustment: relayerConfig.target_gas_adjustment || 1.5,
          connection_id: relayerConfig.target_connection_id || 'connection-0',
          debug: relayerConfig.debug || false,
          timeout: relayerConfig.timeout || '10s',
          tx_memo: relayerConfig.tx_memo || 'neutron-query-relayer'
        },
        queries_file: relayerConfig.queries_file || '/configs/queries.json',
        check_submitted_tx: relayerConfig.check_submitted_tx !== false,
        storage_path: relayerConfig.storage_path || './storage',
        log_level: relayerConfig.log_level || 'info'
      }
    };

    return JSON.stringify(config, null, 2);
  }
}

/**
 * Service generator for Neutron Query Relayer
 */
export class NeutronQueryServiceGenerator implements IGenerator {
  private config: StarshipConfig;
  private relayer: Relayer;

  constructor(relayer: Relayer, config: StarshipConfig) {
    this.config = config;
    this.relayer = relayer;
  }

  generate(): Array<Service> {
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

    const ports = [
      {
        name: 'metrics',
        port: this.relayer.config?.metrics_port || 9090,
        protocol: 'TCP' as const,
        targetPort: this.relayer.config?.metrics_port || 9090
      }
    ];

    return [
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata,
        spec: {
          clusterIP: 'None',
          ports,
          selector: {
            'app.kubernetes.io/name': `${this.relayer.type}-${this.relayer.name}`
          }
        }
      }
    ];
  }
}

/**
 * StatefulSet generator for Neutron Query Relayer
 */
export class NeutronQueryStatefulSetGenerator implements IGenerator {
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

    // Add neutron-query-relayer init container
    initContainers.push(this.generateNeutronQueryInitContainer());

    return initContainers;
  }

  private generateNeutronQueryInitContainer(): Container {
    const image =
      this.relayer.image ||
      'ghcr.io/cosmology-tech/starship/neutron-query-relayer:v0.2.0';
    const env = this.generateEnvironmentVariables();

    const command = this.generateNeutronQueryInitCommand();

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

    // Main neutron-query-relayer container
    containers.push({
      name: 'relayer',
      image:
        this.relayer.image ||
        'ghcr.io/cosmology-tech/starship/neutron-query-relayer:v0.2.0',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: this.generateEnvironmentVariables(),
      command: ['bash', '-c'],
      args: [
        'RLY_INDEX=${HOSTNAME##*-}\necho "Relayer Index: $RLY_INDEX"\nneutron-query-relayer start --config /configs/config.json'
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

  private generateEnvironmentVariables(): EnvVar[] {
    const relayerConfig = this.relayer.config || {};

    return [
      { name: 'KEYS_CONFIG', value: '/keys/keys.json' },
      { name: 'RELAYER_INDEX', value: '${HOSTNAME##*-}' },
      {
        name: 'NAMESPACE',
        valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } }
      },
      { name: 'CONFIG_PATH', value: '/configs/config.json' },
      {
        name: 'STORAGE_PATH',
        value: relayerConfig.storage_path || './storage'
      },
      { name: 'LOG_LEVEL', value: relayerConfig.log_level || 'info' },
      {
        name: 'METRICS_PORT',
        value: String(relayerConfig.metrics_port || 9090)
      }
    ];
  }

  private generateNeutronQueryInitCommand(): string {
    let command = `set -ux

RLY_INDEX=\${HOSTNAME##*-}
echo "Relayer Index: $RLY_INDEX"

mkdir -p $STORAGE_PATH

NEUTRON_MNEMONIC=$(jq -r ".relayers[$RLY_INDEX].mnemonic" $KEYS_CONFIG)
TARGET_MNEMONIC=$(jq -r ".relayers[$RLY_INDEX].mnemonic" $KEYS_CONFIG)

`;

    // Add key creation and funding for each chain
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) return;

      command += `
echo "Setting up keys for ${chainId}..."
# Keys will be managed through environment variables for neutron-query-relayer

DENOM="${chain.denom}"
# For neutron-query-relayer, we need to derive the address from mnemonic
# This will be handled by the relayer binary itself

echo "Chain ${chainId} setup completed"
`;
    });

    return command;
  }
}

/**
 * Main Neutron Query Relayer builder
 */
export class NeutronQueryRelayerBuilder extends BaseRelayerBuilder {
  constructor(relayer: Relayer, config: StarshipConfig) {
    super(relayer, config);
    this.generators = [
      new NeutronQueryConfigMapGenerator(relayer, config),
      new NeutronQueryServiceGenerator(relayer, config),
      new NeutronQueryStatefulSetGenerator(relayer, config)
    ];
  }
}
