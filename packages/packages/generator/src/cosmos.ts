import { KubernetesClient, ConfigMap, Service, StatefulSet } from 'kubernetesjs';
import { StarshipConfig, Chain } from '@starship-ci/types/src';
import { GeneratorContext } from './types';
import { DefaultsManager } from './defaults';
import { ScriptManager } from './scripts';
import { TemplateHelpers } from './helpers';

// Helper functions
function getHostname(chain: Chain): string {
  return chain.name || String(chain.id);
}

function getChainId(chain: Chain): string {
  return String(chain.id);
}

/**
 * ConfigMap generator for Cosmos chains
 * Handles scripts, genesis patches, and ICS consumer proposals
 */
export class CosmosConfigMapGenerator {
  private scriptManager: ScriptManager;
  private defaultsManager: DefaultsManager;
  private config: StarshipConfig;
  private chain: Chain;

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.scriptManager = scriptManager;
    this.defaultsManager = new DefaultsManager();
    this.config = config;
    this.chain = this.defaultsManager.processChain(chain);
  }

  /**
   * Create scripts ConfigMap
   */
  scriptsConfigMap(): ConfigMap {
    const scriptsData: Record<string, string> = {};
    
    for (const [key, script] of Object.entries(this.chain.scripts)) {
      const scriptName = script.name || `${key}.sh`;
      scriptsData[scriptName] = this.scriptManager.getScriptContent(script);
    }

    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `setup-scripts-${getHostname(this.chain)}`,
        labels: TemplateHelpers.commonLabels(this.config),
      },
      data: scriptsData,
    };
  }

  /**
   * Create genesis patch ConfigMap
   */
  genesisPatchConfigMap(): ConfigMap | null {
    if (!this.chain.genesis) return null;

    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `patch-${getHostname(this.chain)}`,
        labels: TemplateHelpers.commonLabels(this.config),
      },
      data: {
        'genesis.json': JSON.stringify(this.chain.genesis, null, 2),
      },
    };
  }

  /**
   * Create ICS consumer proposal ConfigMap
   */
  icsConsumerProposalConfigMap(): ConfigMap | null {
    if (!this.chain.ics?.enabled) return null;

    const icsChain = this.defaultsManager.processChain(
      this.config.chains.find(c => c.id === this.chain.ics.provider)!
    );

    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `consumer-proposal-${getHostname(this.chain)}`,
        labels: TemplateHelpers.commonLabels(this.config),
      },
      data: {
        'proposal.json': JSON.stringify({
          title: `Add ${this.chain.name} consumer chain`,
          summary: `Add ${this.chain.name} consumer chain with id ${getChainId(this.chain)}`,
          chain_id: getChainId(this.chain),
          initial_height: {
            revision_height: 1,
            revision_number: 1,
          },
          genesis_hash: 'd86d756e10118e66e6805e9cc476949da2e750098fcc7634fd0cc77f57a0b2b0',
          binary_hash: '376cdbd3a222a3d5c730c9637454cd4dd925e2f9e2e0d0f3702fc922928583f1',
          spawn_time: '2023-02-28T20:40:00.000000Z',
          unbonding_period: 294000000000,
          ccv_timeout_period: 259920000000,
          transfer_timeout_period: 18000000000,
          consumer_redistribution_fraction: '0.75',
          blocks_per_distribution_transmission: 10,
          historical_entries: 100,
          distribution_transmission_channel: '',
          top_N: 95,
          validators_power_cap: 0,
          validator_set_cap: 0,
          allowlist: [],
          denylist: [],
          deposit: `10000${icsChain.denom}`,
        }, null, 2),
      },
    };
  }
}

/**
 * Service generator for Cosmos chains
 * Handles genesis and validator services
 */
export class CosmosServiceGenerator {
  private config: StarshipConfig;
  private chain: Chain;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
  }

  /**
   * Create Service for genesis node
   */
  genesisService(): Service {
    const portMap = TemplateHelpers.getPortMap();
    const ports = Object.entries(portMap).map(([name, port]) => ({
      name,
      port,
      protocol: 'TCP' as const,
      targetPort: String(port),
    }));

    // Add metrics port if enabled
    if (this.chain.metrics) {
      ports.push({
        name: 'metrics',
        port: 26660,
        protocol: 'TCP' as const,
        targetPort: '26660',
      });
    }

    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: `${getHostname(this.chain)}-genesis`,
        labels: {
          ...TemplateHelpers.commonLabels(this.config),
          'app.kubernetes.io/name': `${getChainId(this.chain)}-genesis`,
        },
      },
      spec: {
        clusterIP: 'None',
        ports,
        selector: {
          'app.kubernetes.io/name': `${getChainId(this.chain)}-genesis`,
        },
      },
    };
  }

  /**
   * Create Service for validator nodes
   */
  validatorService(): Service {
    const portMap = TemplateHelpers.getPortMap();
    const ports = Object.entries(portMap).map(([name, port]) => ({
      name,
      port,
      protocol: 'TCP' as const,
      targetPort: String(port),
    }));

    if (this.chain.metrics) {
      ports.push({
        name: 'metrics',
        port: 26660,
        protocol: 'TCP' as const,
        targetPort: '26660',
      });
    }

    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: `${getHostname(this.chain)}-validator`,
        labels: {
          ...TemplateHelpers.commonLabels(this.config),
          'app.kubernetes.io/name': `${getChainId(this.chain)}-validator`,
        },
      },
      spec: {
        clusterIP: 'None',
        ports,
        selector: {
          'app.kubernetes.io/name': `${getChainId(this.chain)}-validator`,
        },
      },
    };
  }
}

/**
 * StatefulSet generator for Cosmos chains
 * Handles genesis and validator StatefulSets with proper container and init container management
 */
export class CosmosStatefulSetGenerator {
  private scriptManager: ScriptManager;
  private defaultsManager: DefaultsManager;
  private config: StarshipConfig;
  private chain: any; // ProcessedChain

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.scriptManager = scriptManager;
    this.defaultsManager = new DefaultsManager();
    this.config = config;
    this.chain = this.defaultsManager.processChain(chain);
  }

  /**
   * Create StatefulSet for genesis node
   */
  genesisStatefulSet(): StatefulSet {
    return {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata: {
        name: `${getHostname(this.chain)}-genesis`,
        labels: TemplateHelpers.commonLabels(this.config),
      },
      spec: {
        serviceName: `${getHostname(this.chain)}-genesis`,
        replicas: 1,
        revisionHistoryLimit: 3,
        selector: {
          matchLabels: {
            'app.kubernetes.io/instance': this.chain.name || getChainId(this.chain),
            'app.kubernetes.io/name': `${getChainId(this.chain)}-genesis`,
          },
        },
        template: {
          metadata: {
            annotations: {
              quality: 'release',
              role: 'api-gateway',
              sla: 'high',
              tier: 'gateway',
            },
            labels: {
              'app.kubernetes.io/instance': this.chain.name || getChainId(this.chain),
              'app.kubernetes.io/type': getChainId(this.chain),
              'app.kubernetes.io/name': `${getChainId(this.chain)}-genesis`,
              'app.kubernetes.io/rawname': getChainId(this.chain),
              'app.kubernetes.io/version': this.config.version || '1.8.0',
            },
          },
          spec: {
            ...(this.chain.imagePullSecrets ? TemplateHelpers.generateImagePullSecrets(this.chain.imagePullSecrets) : {}),
            initContainers: this.genesisInitContainers(),
            containers: this.genesisContainers(),
            volumes: TemplateHelpers.generateChainVolumes(this.chain),
          },
        },
      },
    };
  }

  /**
   * Create StatefulSet for validator nodes
   */
  validatorStatefulSet(): StatefulSet {
    return {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata: {
        name: `${getHostname(this.chain)}-validator`,
        labels: TemplateHelpers.commonLabels(this.config),
      },
      spec: {
        serviceName: `${getHostname(this.chain)}-validator`,
        podManagementPolicy: 'Parallel',
        replicas: (this.chain.numValidators || 1) - 1,
        revisionHistoryLimit: 3,
        selector: {
          matchLabels: {
            'app.kubernetes.io/instance': this.chain.name || getChainId(this.chain),
            'app.kubernetes.io/name': `${getChainId(this.chain)}-validator`,
          },
        },
        template: {
          metadata: {
            annotations: {
              quality: 'release',
              role: 'api-gateway',
              sla: 'high',
              tier: 'gateway',
            },
            labels: {
              'app.kubernetes.io/instance': this.chain.name || getChainId(this.chain),
              'app.kubernetes.io/type': getChainId(this.chain),
              'app.kubernetes.io/name': `${getChainId(this.chain)}-validator`,
              'app.kubernetes.io/version': this.config.version || '1.8.0',
            },
          },
          spec: {
            ...(this.chain.imagePullSecrets ? TemplateHelpers.generateImagePullSecrets(this.chain.imagePullSecrets) : {}),
            initContainers: this.validatorInitContainers(),
            containers: this.validatorContainers(),
            volumes: TemplateHelpers.generateChainVolumes(this.chain),
          },
        },
      },
    };
  }

  /**
   * Create init containers for genesis node
   */
  private genesisInitContainers(): any[] {
    const initContainers: any[] = [];
    const exposerPort = this.config.exposer?.ports?.rest || 8081;

    // Build images init container if needed
    if (this.chain.build?.enabled || this.chain.upgrade?.enabled) {
      let buildCommands = [
        '# Install cosmovisor',
        'go install github.com/cosmos/cosmos-sdk/cosmovisor/cmd/cosmovisor@v1.0.0',
        '',
        '# Build genesis'
      ];

      if (this.chain.upgrade?.enabled) {
        // Build genesis version
        buildCommands.push(`UPGRADE_NAME=genesis CODE_TAG=${this.chain.upgrade.genesis} bash -e /scripts/build-chain.sh`);
        
        // Build upgrade versions
        if (this.chain.upgrade.upgrades) {
          this.chain.upgrade.upgrades.forEach((upgrade: any) => {
            buildCommands.push(`UPGRADE_NAME=${upgrade.name} CODE_TAG=${upgrade.version} bash -e /scripts/build-chain.sh`);
          });
        }
      } else if (this.chain.build?.enabled) {
        buildCommands.push(`UPGRADE_NAME=genesis CODE_TAG=${this.chain.build.source} bash -e /scripts/build-chain.sh`);
      }

      initContainers.push({
        name: 'init-build-images',
        image: 'ghcr.io/cosmology-tech/starship/builder:latest',
        imagePullPolicy: 'IfNotPresent',
        command: ['bash', '-c', buildCommands.join('\n')],
        env: [
          { name: 'CODE_REF', value: this.chain.repo },
          { name: 'UPGRADE_DIR', value: `${this.chain.home}/cosmovisor` },
          { name: 'GOBIN', value: '/go/bin' },
          { name: 'CHAIN_NAME', value: getChainId(this.chain) },
          ...TemplateHelpers.defaultEnvVars(this.chain),
        ],
        resources: TemplateHelpers.nodeResources(this.chain, this.config),
        volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
      });
    }

    // Genesis init container
    initContainers.push({
      name: 'init-genesis',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        ...TemplateHelpers.timeoutVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'FAUCET_ENABLED', value: String(this.chain.faucet?.enabled || false) },
        { name: 'NUM_VALIDATORS', value: String(this.chain.numValidators || 1) },
        { name: 'NUM_RELAYERS', value: String(this.config.relayers?.length || 0) },
      ],
      command: ['bash', '-c', this.genesisScript()],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
    });

    // Config init container
    initContainers.push({
      name: 'init-config',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        ...TemplateHelpers.timeoutVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'METRICS', value: String(this.chain.metrics || false) },
      ],
      command: ['bash', '-c', '/scripts/update-config.sh'],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: [
        ...TemplateHelpers.generateChainVolumeMounts(this.chain),
        ...(this.chain.genesis ? [{
          mountPath: '/patch',
          name: 'patch',
        }] : []),
      ],
    });

    // Add additional init containers based on chain configuration
    if (this.chain.faucet?.enabled && this.chain.faucet.type === 'starship') {
      initContainers.push(this.faucetInitContainer());
    }

    if (this.chain.ics?.enabled) {
      initContainers.push(this.icsInitContainer(exposerPort));
    }

    return initContainers;
  }

  /**
   * Create main containers for genesis node
   */
  private genesisContainers(): any[] {
    const containers: any[] = [];

    // Main validator container
    containers.push({
      name: 'validator',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        { name: 'FAUCET_ENABLED', value: String(this.chain.faucet?.enabled || false) },
        { name: 'SLOGFILE', value: 'slog.slog' },
        ...(this.chain.env || []).map((env: any) => ({ name: env.name, value: String(env.value) })),
      ],
      command: ['bash', '-c', this.validatorStartScript()],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
      ...(this.chain.cometmock?.enabled ? {} : {
        readinessProbe: this.chain.readinessProbe || {
          exec: {
            command: ['bash', '-e', '/scripts/chain-rpc-ready.sh', 'http://localhost:26657'],
          },
          initialDelaySeconds: 10,
          periodSeconds: 10,
          timeoutSeconds: 15,
        },
      }),
    });

    // Exposer container
    containers.push({
      name: 'exposer',
      image: this.config.exposer?.image || 'ghcr.io/cosmology-tech/starship/exposer:latest',
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.genesisVars(this.chain, this.config.exposer?.ports?.rest || 8081),
        { name: 'EXPOSER_HTTP_PORT', value: '8081' },
        { name: 'EXPOSER_GRPC_PORT', value: '9099' },
        { name: 'EXPOSER_GENESIS_FILE', value: `${this.chain.home}/config/genesis.json` },
        { name: 'EXPOSER_MNEMONIC_FILE', value: '/configs/keys.json' },
        { name: 'EXPOSER_PRIV_VAL_FILE', value: `${this.chain.home}/config/priv_validator_key.json` },
        { name: 'EXPOSER_NODE_KEY_FILE', value: `${this.chain.home}/config/node_key.json` },
        { name: 'EXPOSER_NODE_ID_FILE', value: `${this.chain.home}/config/node_id.json` },
        { name: 'EXPOSER_PRIV_VAL_STATE_FILE', value: `${this.chain.home}/data/priv_validator_state.json` },
      ],
      command: ['exposer'],
      resources: TemplateHelpers.getResourceObject(this.config.exposer?.resources || { cpu: '0.1', memory: '128M' }),
      volumeMounts: [
        { mountPath: this.chain.home, name: 'node' },
        { mountPath: '/configs', name: 'addresses' },
      ],
    });

    // Faucet container if enabled
    if (this.chain.faucet?.enabled) {
      containers.push(this.faucetContainer());
    }

    return containers;
  }

  /**
   * Create init containers for validator nodes
   */
  private validatorInitContainers(): any[] {
    const initContainers: any[] = [];

    // Build images init container if needed
    if (this.chain.build?.enabled || this.chain.upgrade?.enabled) {
      let buildCommands = [
        '# Install cosmovisor',
        'go install github.com/cosmos/cosmos-sdk/cosmovisor/cmd/cosmovisor@v1.0.0',
        '',
        '# Build genesis'
      ];

      if (this.chain.upgrade?.enabled) {
        // Build genesis version
        buildCommands.push(`UPGRADE_NAME=genesis CODE_TAG=${this.chain.upgrade.genesis} bash -e /scripts/build-chain.sh`);
        
        // Build upgrade versions
        if (this.chain.upgrade.upgrades) {
          this.chain.upgrade.upgrades.forEach((upgrade: any) => {
            buildCommands.push(`UPGRADE_NAME=${upgrade.name} CODE_TAG=${upgrade.version} bash -e /scripts/build-chain.sh`);
          });
        }
      } else if (this.chain.build?.enabled) {
        buildCommands.push(`UPGRADE_NAME=genesis CODE_TAG=${this.chain.build.source} bash -e /scripts/build-chain.sh`);
      }

      initContainers.push({
        name: 'init-build-images',
        image: 'ghcr.io/cosmology-tech/starship/builder:latest',
        imagePullPolicy: 'IfNotPresent',
        command: ['bash', '-c', buildCommands.join('\n')],
        env: [
          { name: 'CODE_REF', value: this.chain.repo },
          { name: 'UPGRADE_DIR', value: `${this.chain.home}/cosmovisor` },
          { name: 'GOBIN', value: '/go/bin' },
          { name: 'CHAIN_NAME', value: getChainId(this.chain) },
          ...TemplateHelpers.defaultEnvVars(this.chain),
        ],
        resources: TemplateHelpers.nodeResources(this.chain, this.config),
        volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
      });
    }

    // Validator init container
    initContainers.push({
      name: 'init-validator',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        ...TemplateHelpers.timeoutVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
      ],
      command: ['bash', '-c', this.validatorInitScript()],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
    });

    // Validator config init container
    initContainers.push({
      name: 'init-validator-config',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        ...TemplateHelpers.timeoutVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'METRICS', value: String(this.chain.metrics || false) },
      ],
      command: ['bash', '-c', this.validatorConfigScript()],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
    });

    return initContainers;
  }

  /**
   * Create main containers for validator nodes
   */
  private validatorContainers(): any[] {
    const containers: any[] = [];

    // Main validator container
    containers.push({
      name: 'validator',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        ...TemplateHelpers.chainEnvVars(this.chain),
        { name: 'SLOGFILE', value: 'slog.slog' },
        ...(this.chain.env || []).map((env: any) => ({ name: env.name, value: String(env.value) })),
      ],
      command: ['bash', '-c', this.validatorStartScript()],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
      lifecycle: {
        postStart: {
          exec: {
            command: ['bash', '-c', this.validatorPostStartScript()],
          },
        },
      },
      ...(this.chain.cometmock?.enabled ? {} : {
        readinessProbe: this.chain.readinessProbe || {
          exec: {
            command: ['bash', '-e', '/scripts/chain-rpc-ready.sh', 'http://localhost:26657'],
          },
          initialDelaySeconds: 10,
          periodSeconds: 10,
          timeoutSeconds: 15,
        },
      }),
    });

    return containers;
  }

  private genesisScript(): string {
    return this.scriptManager.getScriptContent(this.chain.scripts['create-genesis'] || {
      name: 'create-genesis.sh',
      data: '/scripts/create-genesis.sh',
    });
  }

  private configScript(): string {
    return this.scriptManager.getScriptContent(this.chain.scripts['update-config'] || {
      name: 'update-config.sh',
      data: '/scripts/update-config.sh',
    });
  }

  private validatorStartScript(): string {
    return `#!/bin/bash
set -euo pipefail

echo "Starting ${this.chain.binary} validator..."
exec ${this.chain.binary} start --home ${this.chain.home} --log_level info`;
  }

  private validatorInitScript(): string {
    return `#!/bin/bash
set -euo pipefail

echo "Initializing validator node for ${getChainId(this.chain)}..."
${this.chain.binary} init validator-\${HOSTNAME##*-} --chain-id ${getChainId(this.chain)} --home ${this.chain.home}
echo "Validator initialization completed"`;
  }

  private validatorConfigScript(): string {
    return this.scriptManager.getScriptContent(this.chain.scripts['update-config'] || {
      name: 'update-config.sh',
      data: '/scripts/update-config.sh',
    });
  }

  private validatorPostStartScript(): string {
    return `#!/bin/bash
echo "Validator post-start hook for ${getChainId(this.chain)}"
# Add any post-start logic here`;
  }

  private faucetInitContainer(): any {
    return {
      name: 'init-faucet',
      image: this.chain.faucet!.image,
      imagePullPolicy: 'IfNotPresent',
      command: ['bash', '-c', 'cp /bin/faucet /faucet/faucet && chmod +x /faucet/faucet'],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: [{ mountPath: '/faucet', name: 'faucet' }],
    };
  }

  private icsInitContainer(exposerPort: number): any {
    return {
      name: 'init-ics',
      image: this.chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...TemplateHelpers.defaultEnvVars(this.chain),
        { name: 'EXPOSER_PORT', value: String(exposerPort) },
      ],
      command: ['bash', '-c', `echo "ICS initialization for consumer chain ${getChainId(this.chain)}"`],
      resources: TemplateHelpers.nodeResources(this.chain, this.config),
      volumeMounts: TemplateHelpers.generateChainVolumeMounts(this.chain),
    };
  }

  private faucetContainer(): any {
    if (this.chain.faucet?.type === 'cosmjs') {
      return this.cosmjsFaucetContainer();
    }
    return this.starshipFaucetContainer();
  }

  private cosmjsFaucetContainer(): any {
    return {
      name: 'faucet',
      image: this.chain.faucet!.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        { name: 'FAUCET_CONCURRENCY', value: String(this.chain.faucet!.concurrency || 1) },
        { name: 'FAUCET_PORT', value: String(this.chain.faucet!.ports?.rest || 8000) },
        { name: 'FAUCET_GAS_PRICE', value: this.chain.faucet!.gasPrice || '0.025' },
        { name: 'FAUCET_PATH_PATTERN', value: this.chain.faucet!.pathPattern || '' },
        { name: 'FAUCET_ADDRESS_PREFIX', value: this.chain.prefix },
        { name: 'FAUCET_TOKENS', value: this.chain.faucet!.tokens?.join(',') || this.chain.denom },
        { name: 'FAUCET_CREDIT_AMOUNT_SEND', value: String(this.chain.faucet!.creditAmount?.send || 10000000) },
        { name: 'FAUCET_CREDIT_AMOUNT_STAKE', value: String(this.chain.faucet!.creditAmount?.stake || 10000000) },
        { name: 'FAUCET_MAX_CREDIT', value: String(this.chain.faucet!.maxCredit || 99999999) },
        { name: 'FAUCET_MNEMONIC', value: this.chain.faucet!.mnemonic || '' },
        { name: 'FAUCET_CHAIN_ID', value: getChainId(this.chain) },
        { name: 'FAUCET_RPC_ENDPOINT', value: `http://localhost:${TemplateHelpers.getPortMap().rpc}` },
      ],
      command: ['yarn', 'start'],
      resources: TemplateHelpers.getResourceObject(this.chain.faucet!.resources || { cpu: '0.2', memory: '200M' }),
      volumeMounts: [{ mountPath: '/configs', name: 'addresses' }],
    };
  }

  private starshipFaucetContainer(): any {
    return {
      name: 'faucet',
      image: 'busybox:1.34.1',
      imagePullPolicy: 'IfNotPresent',
      env: [
        { name: 'FAUCET_CONCURRENCY', value: String(this.chain.faucet!.concurrency || 1) },
        { name: 'FAUCET_PORT', value: String(this.chain.faucet!.ports?.rest || 8000) },
        { name: 'FAUCET_CHAIN_ID', value: getChainId(this.chain) },
        { name: 'FAUCET_CHAIN_DENOM', value: this.chain.denom },
        { name: 'FAUCET_CHAIN_PREFIX', value: this.chain.prefix },
        { name: 'FAUCET_AMOUNT_SEND', value: String(this.chain.faucet!.creditAmount?.send || 10000000) },
        { name: 'FAUCET_AMOUNT_STAKE', value: String(this.chain.faucet!.creditAmount?.stake || 10000000) },
        { name: 'FAUCET_RPC_ENDPOINT', value: `http://localhost:${TemplateHelpers.getPortMap().rpc}` },
        { name: 'FAUCET_REST_ENDPOINT', value: `http://localhost:${TemplateHelpers.getPortMap().rest}` },
      ],
      command: ['sh', '-c', '/faucet/faucet'],
      resources: TemplateHelpers.getResourceObject(this.chain.faucet!.resources || { cpu: '0.1', memory: '128M' }),
      volumeMounts: [
        { mountPath: '/configs', name: 'addresses' },
        { mountPath: '/faucet', name: 'faucet' },
      ],
    };
  }
}

/**
 * Main Cosmos chain builder using KubernetesJS
 * Orchestrates ConfigMap, Service, and StatefulSet generation
 */
export class CosmosChainBuilder {
  private kubernetesClient: KubernetesClient;
  private defaultsManager: DefaultsManager;
  private scriptManager: ScriptManager;
  private context: GeneratorContext;

  constructor(context: GeneratorContext, kubernetesEndpoint?: string) {
    this.context = context;
    this.kubernetesClient = new KubernetesClient({
      restEndpoint: kubernetesEndpoint || 'http://localhost:8001'
    });
    this.defaultsManager = new DefaultsManager();
    this.scriptManager = new ScriptManager();
  }

  /**
   * Build all Kubernetes manifests for a Cosmos chain
   */
  buildChainManifests(chain: Chain): Array<ConfigMap | Service | StatefulSet> {
    // Skip Ethereum chains
    if (chain.name?.startsWith('ethereum')) {
      return [];
    }

    const processedChain = this.defaultsManager.processChain(chain);
    const manifests: Array<ConfigMap | Service | StatefulSet> = [];

    // Create generators for this chain
    const configMapGenerator = new CosmosConfigMapGenerator(chain, this.context.config, this.scriptManager);
    const serviceGenerator = new CosmosServiceGenerator(chain, this.context.config);
    const statefulSetGenerator = new CosmosStatefulSetGenerator(chain, this.context.config, this.scriptManager);

    // Build ConfigMaps
    manifests.push(configMapGenerator.scriptsConfigMap());
    
    const genesisPatch = configMapGenerator.genesisPatchConfigMap();
    if (genesisPatch) manifests.push(genesisPatch);
    
    const icsProposal = configMapGenerator.icsConsumerProposalConfigMap();
    if (icsProposal) manifests.push(icsProposal);

    // Build Services
    manifests.push(serviceGenerator.genesisService());
    
    if (processedChain.numValidators > 1) {
      manifests.push(serviceGenerator.validatorService());
    }

    // Build StatefulSets
    manifests.push(statefulSetGenerator.genesisStatefulSet());
    
    if (processedChain.numValidators > 1) {
      manifests.push(statefulSetGenerator.validatorStatefulSet());
    }

    // Build cometmock if enabled
    if (processedChain.cometmock?.enabled) {
      manifests.push(...this.cometmockManifests(processedChain));
    }

    return manifests;
  }

  /**
   * Deploy manifests to Kubernetes using KubernetesJS client
   */
  async deployChain(chain: Chain, namespace: string = 'default'): Promise<void> {
    const manifests = this.buildChainManifests(chain);
    
    for (const manifest of manifests) {
      try {
        await this.deployManifest(manifest, namespace);
      } catch (error) {
        console.error(`Failed to deploy ${manifest.kind} ${manifest.metadata?.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Deploy individual manifest using appropriate KubernetesJS method
   */
  private async deployManifest(manifest: any, namespace: string): Promise<void> {
    switch (manifest.kind) {
      case 'ConfigMap':
        await this.kubernetesClient.createCoreV1NamespacedConfigMap({
          path: { namespace },
          query: {},
          body: manifest
        });
        break;
      case 'Service':
        await this.kubernetesClient.createCoreV1NamespacedService({
          path: { namespace },
          query: {},
          body: manifest
        });
        break;
      case 'StatefulSet':
        await this.kubernetesClient.createAppsV1NamespacedStatefulSet({
          path: { namespace },
          query: {},
          body: manifest
        });
        break;
      default:
        throw new Error(`Unsupported manifest kind: ${manifest.kind}`);
    }
  }

  /**
   * Build cometmock manifests (placeholder for now)
   */
  private cometmockManifests(chain: any): Array<ConfigMap | Service | StatefulSet> {
    // TODO: Implement cometmock manifest generation
    return [];
  }
}
