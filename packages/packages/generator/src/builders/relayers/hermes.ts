import { Relayer, StarshipConfig } from '@starship-ci/types';
import {
  ConfigMap,
  Container,
  Service,
  StatefulSet,
  Volume
} from 'kubernetesjs';

import * as helpers from '../../helpers';
import { IGenerator } from '../../types';
import { getGeneratorVersion } from '../../version';
import { BaseRelayerBuilder } from './base';
import { getAddressType, getGasPrice } from './utils';

/**
 * ConfigMap generator for Hermes relayer
 */
export class HermesConfigMapGenerator implements IGenerator {
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

    const configToml = this.generateHermesConfig();

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata,
        data: {
          'config.toml': configToml,
          'config-cli.toml': configToml.replace(
            /key_name = "([^"]+)"/g,
            'key_name = "$1-cli"'
          )
        }
      }
    ];
  }

  private generateHermesConfig(): string {
    const relayerConfig = this.relayer.config || {};
    const globalConfig = relayerConfig.global || {};
    const modeConfig = relayerConfig.mode || {};
    const restConfig = relayerConfig.rest || {};
    const telemetryConfig = relayerConfig.telemetry || {};
    const eventSourceConfig = relayerConfig.event_source || {};

    let configToml = `# The global section has parameters that apply globally to the relayer operation.
[global]
log_level = "${globalConfig.log_level || 'info'}"

[mode]
[mode.clients]
enabled = ${modeConfig.clients?.enabled ?? true}
refresh = ${modeConfig.clients?.refresh ?? true}
misbehaviour = ${modeConfig.clients?.misbehaviour ?? true}

[mode.connections]
enabled = ${modeConfig.connections?.enabled ?? true}

[mode.channels]
enabled = ${modeConfig.channels?.enabled ?? true}

[mode.packets]
enabled = ${modeConfig.packets?.enabled ?? true}
clear_interval = ${modeConfig.packets?.clear_interval ?? 100}
clear_on_start = ${modeConfig.packets?.clear_on_start ?? true}
tx_confirmation = ${modeConfig.packets?.tx_confirmation ?? true}

[rest]
enabled = ${restConfig.enabled ?? true}
host = "${restConfig.host || '0.0.0.0'}"
port = ${restConfig.port || 3000}

[telemetry]
enabled = ${telemetryConfig.enabled ?? true}
host = "${telemetryConfig.host || '0.0.0.0'}"
port = ${telemetryConfig.port || 3001}

`;

    // Add chain configurations
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not found in configuration`);
      }

      const chainConfig =
        relayerConfig.chains?.find((c: any) => c.id === chainId) || {};
      const chainName = helpers.getChainName(String(chain.id));
      const addressType = getAddressType(chain.name);
      const gasPrice = getGasPrice(chain.name, chain.denom);

      configToml += `
[[chains]]
id = "${chainId}"
type = "CosmosSdk"
key_name = "${chainId}"
${chain.ics?.enabled ? 'ccv_consumer_chain = true' : ''}
rpc_addr = "http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:26657"
grpc_addr = "http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:9090"
${
  eventSourceConfig.mode === 'pull'
    ? `event_source = { mode = 'pull', interval = '${
        eventSourceConfig.interval || '500ms'
      }' }`
    : `event_source = { mode = 'push', url = "ws://${chainName}-genesis.$NAMESPACE.svc.cluster.local:26657/websocket", batch_delay = '${
        eventSourceConfig.batch_delay || '500ms'
      }' }`
}
trusted_node = false
account_prefix = "${chainConfig.account_prefix || chain.prefix}"
default_gas = ${chainConfig.default_gas || 500000000}
max_gas = ${chainConfig.max_gas || 1000000000}
rpc_timeout = "${chainConfig.rpc_timeout || '10s'}"
store_prefix = "${chainConfig.store_prefix || 'ibc'}"
gas_multiplier = ${chainConfig.gas_multiplier || 2}
max_msg_num = ${chainConfig.max_msg_num || 30}
max_tx_size = ${chainConfig.max_tx_size || 2097152}
clock_drift = "${chainConfig.clock_drift || '5s'}"
max_block_time = "${chainConfig.max_block_time || '30s'}"
trusting_period = "${chainConfig.trusting_period || '75s'}"
trust_threshold = { numerator = "${
        (chainConfig.trust_threshold || {}).numerator || '2'
      }", denominator = "${(chainConfig.trust_threshold || {}).denominator || '3'}" }
${addressType}
${gasPrice}
`;
    });

    return configToml;
  }
}

/**
 * Service generator for Hermes relayer
 */
export class HermesServiceGenerator implements IGenerator {
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
        name: 'rest',
        port: 3000,
        protocol: 'TCP' as const,
        targetPort: this.relayer.config?.rest?.port || 3000
      },
      {
        name: 'exposer',
        port: this.config.exposer?.ports?.rest || 8081,
        protocol: 'TCP' as const,
        targetPort: this.config.exposer?.ports?.rest || 8081
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
 * StatefulSet generator for Hermes relayer
 */
export class HermesStatefulSetGenerator implements IGenerator {
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

    // Add exposer init container
    initContainers.push({
      name: 'init-exposer',
      image:
        this.config.exposer?.image ||
        'ghcr.io/cosmology-tech/starship/exposer:v0.2.0',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      command: ['bash', '-c'],
      args: [
        '# Install exposer binary from the image\ncp /bin/exposer /exposer/exposer\nchmod +x /exposer/exposer'
      ],
      resources: helpers.getResourceObject(
        this.relayer.resources || { cpu: '0.1', memory: '100M' }
      ),
      volumeMounts: [{ mountPath: '/exposer', name: 'exposer' }]
    });

    // Add single wait init container for all chains
    const exposerPort = this.config.exposer?.ports?.rest || 8081;
    initContainers.push(
      helpers.generateWaitInitContainer(
        this.relayer.chains,
        exposerPort,
        this.config
      )
    );

    // Add hermes init container
    initContainers.push(this.generateHermesInitContainer());

    return initContainers;
  }

  private generateHermesInitContainer(): Container {
    const image =
      this.relayer.image || 'ghcr.io/cosmology-tech/starship/hermes:1.10.0';
    const env = [
      { name: 'KEYS_CONFIG', value: '/keys/keys.json' },
      { name: 'RELAYER_DIR', value: '/root/.hermes' },
      { name: 'RELAYER_INDEX', value: '${HOSTNAME##*-}' },
      {
        name: 'NAMESPACE',
        valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } }
      }
    ];

    const command = this.generateHermesInitCommand();

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

    // Main hermes container
    containers.push({
      name: 'relayer',
      image:
        this.relayer.image || 'ghcr.io/cosmology-tech/starship/hermes:1.10.0',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        { name: 'RELAYER_DIR', value: '/root/.hermes' },
        {
          name: 'NAMESPACE',
          valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } }
        }
      ],
      command: ['bash', '-c'],
      args: [
        'RLY_INDEX=${HOSTNAME##*-}\necho "Relayer Index: $RLY_INDEX"\nhermes start'
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

    // Exposer container
    containers.push({
      name: 'exposer',
      image: this.relayer.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        { name: 'EXPOSER_HTTP_PORT', value: '8081' },
        { name: 'EXPOSER_GRPC_PORT', value: '9099' }
      ],
      command: ['bash', '-c'],
      args: ['/exposer/exposer'],
      resources: helpers.getResourceObject(
        this.config.exposer?.resources || { cpu: '0.1', memory: '100M' }
      ),
      securityContext: {
        allowPrivilegeEscalation: false,
        runAsUser: 0
      },
      volumeMounts: [
        { mountPath: '/root', name: 'relayer' },
        { mountPath: '/configs', name: 'relayer-config' },
        { mountPath: '/exposer', name: 'exposer' }
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
      { name: 'scripts', configMap: { name: 'setup-scripts' } },
      { name: 'exposer', emptyDir: {} }
    ];
  }

  private generateHermesInitCommand(): string {
    let command = `set -ux

RLY_INDEX=\${HOSTNAME##*-}
echo "Relayer Index: $RLY_INDEX"

mkdir -p $RELAYER_DIR
cp /configs/config.toml $RELAYER_DIR/config.toml
cp /configs/config-cli.toml $RELAYER_DIR/config-cli.toml

# Replace namespace placeholder with actual namespace environment variable
sed -i "s|\\$NAMESPACE|$NAMESPACE|g" $RELAYER_DIR/config.toml
sed -i "s|\\$NAMESPACE|$NAMESPACE|g" $RELAYER_DIR/config-cli.toml

MNEMONIC=$(jq -r ".relayers[$RLY_INDEX].mnemonic" $KEYS_CONFIG)
echo $MNEMONIC > $RELAYER_DIR/mnemonic.txt
MNEMONIC_CLI=$(jq -r ".relayers_cli[$RLY_INDEX].mnemonic" $KEYS_CONFIG)
echo $MNEMONIC_CLI > $RELAYER_DIR/mnemonic-cli.txt

`;

    // Add key creation and funding for each chain (both regular and CLI keys)
    this.relayer.chains.forEach((chainId) => {
      const chain = this.config.chains.find((c) => String(c.id) === chainId);
      if (!chain) return;

      const chainName = helpers.getChainName(String(chain.id));
      const hdPath = chain.hdPath || "m/44'/118'/0'/0/0";

      // Create regular key
      command += `
echo "Creating key for ${chainId}..."
hermes keys add \\
  --chain ${chainId} \\
  --mnemonic-file $RELAYER_DIR/mnemonic.txt \\
  --key-name ${chainId} \\
  --hd-path "${hdPath}"
DENOM="${chain.denom}"
RLY_ADDR=$(hermes --json keys list --chain ${chainId} | tail -1 | jq -r '.result."${chainId}".account')

echo "Transfer tokens to address $RLY_ADDR"
bash -e /scripts/transfer-tokens.sh \\
  $RLY_ADDR \\
  $DENOM \\
  http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:8000/credit \\
  "${chain.faucet?.enabled}" || true

echo "Creating key for ${chainId}-cli..."
hermes keys add \\
  --chain ${chainId} \\
  --mnemonic-file $RELAYER_DIR/mnemonic-cli.txt \\
  --key-name ${chainId}-cli \\
  --hd-path "${hdPath}"
RLY_ADDR_CLI=$(hermes --json keys list --chain ${chainId} | tail -1 | jq -r '.result."${chainId}-cli".account')

echo "Transfer tokens to address $RLY_ADDR_CLI"
bash -e /scripts/transfer-tokens.sh \\
  $RLY_ADDR_CLI \\
  $DENOM \\
  http://${chainName}-genesis.$NAMESPACE.svc.cluster.local:8000/credit \\
  "${chain.faucet?.enabled}" || true
`;
    });

    // Add channel creation if specified
    if (this.relayer.channels && this.relayer.channels.length > 0) {
      this.relayer.channels.forEach((channel) => {
        // Build command arguments array and filter out empty values
        const args = [
          'hermes create channel',
          channel['new-connection'] ? '--new-client-connection --yes' : '',
          channel['b-chain'] ? `--b-chain ${channel['b-chain']}` : '',
          channel['a-connection']
            ? `--a-connection ${channel['a-connection']}`
            : '',
          channel['channel-version']
            ? `--channel-version ${channel['channel-version']}`
            : '',
          channel.order ? `--order ${channel.order}` : '',
          `--a-chain ${channel['a-chain']}`,
          `--a-port ${channel['a-port']}`,
          `--b-port ${channel['b-port']}`
        ].filter((arg) => arg.trim() !== ''); // Remove empty arguments

        command += `
${args.join(' \\\n  ')}
`;
      });
    }

    return command;
  }
}

/**
 * Main Hermes relayer builder
 */
export class HermesRelayerBuilder extends BaseRelayerBuilder {
  constructor(relayer: Relayer, config: StarshipConfig) {
    super(relayer, config);
    this.generators = [
      new HermesConfigMapGenerator(relayer, config),
      new HermesServiceGenerator(relayer, config),
      new HermesStatefulSetGenerator(relayer, config)
    ];
  }
}
