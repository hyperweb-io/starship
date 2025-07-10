import {
  Chain,
  Exposer,
  FaucetConfig,
  Relayer,
  Script,
  StarshipConfig
} from '@starship-ci/types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

import { DefaultsConfig } from './types';

/**
 * Deep merge utility for nested objects
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    if (source[key] !== undefined) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  });

  return result;
}

export class DefaultsManager {
  private defaultsData: DefaultsConfig;
  private defaultsPath: string;
  private config: StarshipConfig;

  constructor(defaultsPath?: string) {
    // Default to the configs/defaults.yaml in the generator package
    this.defaultsPath =
      defaultsPath || path.join(__dirname, '../configs/defaults.yaml');
    this.loadDefaults();
  }

  /**
   * Load defaults from the YAML file
   */
  private loadDefaults(): void {
    try {
      if (fs.existsSync(this.defaultsPath)) {
        const yamlContent = fs.readFileSync(this.defaultsPath, 'utf8');
        this.defaultsData = yaml.load(yamlContent) as DefaultsConfig;
      } else {
        console.warn(
          `Defaults file not found at ${this.defaultsPath}, using empty defaults`
        );
        this.defaultsData = {
          defaultChains: {},
          defaultFaucet: {},
          defaultRelayers: {},
          defaultScripts: {},
          defaultCometmock: {
            image: 'ghcr.io/informalsystems/cometmock:v0.37.x'
          }
        };
      }
    } catch (error) {
      console.error('Failed to load defaults.yaml:', error);
      this.defaultsData = {
        defaultChains: {},
        defaultFaucet: {},
        defaultRelayers: {},
        defaultScripts: {},
        defaultCometmock: {
          image: 'ghcr.io/informalsystems/cometmock:v0.37.x'
        }
      };
    }
  }

  /**
   * Get chain defaults for a specific chain name
   */
  getChainDefaults(chainName: string): Chain | undefined {
    return this.defaultsData.defaultChains?.[chainName];
  }

  /**
   * Get faucet defaults for a specific faucet type
   */
  getFaucetDefaults(faucetType: string): FaucetConfig | undefined {
    return this.defaultsData.defaultFaucet?.[faucetType];
  }

  /**
   * Get default scripts
   */
  getDefaultScripts(): Record<string, Script> {
    return this.defaultsData.defaultScripts || {};
  }

  /**
   * Get default relayers
   */
  getDefaultRelayers(): Record<string, any> {
    return this.defaultsData.defaultRelayers || {};
  }

  /**
   * Get default relayer configuration for a specific type
   */
  getRelayerDefaults(relayerType: string): any {
    return this.defaultsData.defaultRelayers?.[relayerType] || {};
  }

  /**
   * Get default cometmock configuration
   */
  getDefaultCometmock(): any {
    return this.defaultsData.defaultCometmock || {};
  }

  /**
   * Process explorer configuration by merging with defaults
   */
  processExplorer(explorerConfig?: any): any {
    const defaultExplorer = this.defaultsData.explorer || {};
    return deepMerge(defaultExplorer, explorerConfig || {});
  }

  /**
   * Process registry configuration by merging with defaults
   */
  processRegistry(registryConfig?: any): any {
    const defaultRegistry = this.defaultsData.registry || {};
    return deepMerge(defaultRegistry, registryConfig || {});
  }

  /**
   * Process faucet configuration by merging with defaults
   */
  processFaucet(faucetConfig?: any): any {
    const defaultGlobalFaucet = this.defaultsData.faucet || {};

    // Determine faucet type (default to 'starship')
    const inputType =
      faucetConfig && typeof faucetConfig === 'object'
        ? faucetConfig.type
        : undefined;
    const defaultType =
      defaultGlobalFaucet && typeof defaultGlobalFaucet === 'object'
        ? (defaultGlobalFaucet as any).type
        : undefined;
    const faucetType = inputType || defaultType || 'starship';

    // Get type-specific defaults (includes image)
    const defaultTypeFaucet = this.getFaucetDefaults(faucetType) || {};

    // Merge: global defaults + type-specific defaults + input config
    const mergedDefaults = deepMerge(defaultGlobalFaucet, defaultTypeFaucet);
    return deepMerge(mergedDefaults, faucetConfig || {});
  }

  /**
   * Process monitoring configuration by merging with defaults
   */
  processMonitoring(monitoringConfig?: any): any {
    const defaultMonitoring = this.defaultsData.monitoring || {};
    return deepMerge(defaultMonitoring, monitoringConfig || {});
  }

  /**
   * Process ingress configuration by merging with defaults
   */
  processIngress(ingressConfig?: any): any {
    const defaultIngress = this.defaultsData.ingress || {};
    return deepMerge(defaultIngress, ingressConfig || {});
  }

  /**
   * Process exposer configuration by merging with defaults
   */
  processExposer(exposerConfig?: Exposer): Exposer {
    const defaultExposer = this.defaultsData.exposer || {};
    return deepMerge(defaultExposer, exposerConfig || {});
  }

  /**
   * Process images configuration by merging with defaults
   */
  processImages(imagesConfig?: any): any {
    const defaultImages = this.defaultsData.images || {};
    return deepMerge(defaultImages, imagesConfig || {});
  }

  /**
   * Process resources configuration by merging with defaults
   */
  processResources(resourcesConfig?: any): any {
    const defaultResources = this.defaultsData.resources || {};
    return deepMerge(defaultResources, resourcesConfig || {});
  }

  /**
   * Process timeouts configuration by merging with defaults
   */
  processTimeouts(timeoutsConfig?: any): any {
    const defaultTimeouts = this.defaultsData.timeouts || {};
    return deepMerge(defaultTimeouts, timeoutsConfig || {});
  }

  /**
   * Process a relayer configuration by merging with defaults
   * This handles partial overrides properly using deep merge
   */
  processRelayer(relayerConfig: Relayer): Relayer {
    // Get default relayer configuration for this type
    const defaultRelayer = this.getRelayerDefaults(relayerConfig.type);

    // Deep merge the configurations (relayer config takes precedence)
    const mergedRelayer = deepMerge(defaultRelayer, relayerConfig);

    // Auto-generate channels if not provided (equivalent to Helm template logic)
    if (!mergedRelayer.channels || mergedRelayer.channels.length === 0) {
      // Check if ICS is enabled
      if (mergedRelayer.ics?.enabled) {
        // ICS case: create consumer/provider channel + transfer channel
        mergedRelayer.channels = [
          {
            'a-chain': mergedRelayer.ics.consumer,
            'a-connection': 'connection-0',
            'a-port': 'consumer',
            'b-port': 'provider',
            order: 'ordered',
            'channel-version': '1'
          },
          {
            'a-chain': mergedRelayer.ics.consumer,
            'a-port': 'transfer',
            'b-port': 'transfer',
            'a-connection': 'connection-0'
          }
        ];
      } else {
        // Regular case: create transfer channel between first two chains
        if (mergedRelayer.chains && mergedRelayer.chains.length >= 2) {
          mergedRelayer.channels = [
            {
              'a-chain': mergedRelayer.chains[0],
              'b-chain': mergedRelayer.chains[1],
              'a-port': 'transfer',
              'b-port': 'transfer',
              'new-connection': true
            }
          ];
        }
      }
    }

    return mergedRelayer;
  }

  /**
   * Process a chain configuration by merging with defaults
   * This replaces the complex _chains.tpl logic
   */
  processChain(chainConfig: Chain): Chain {
    // Get default chain configuration
    const defaultChain = this.getChainDefaults(chainConfig.name);

    // Merge configurations (chain config takes precedence)
    const mergedChain = {
      ...defaultChain,
      ...chainConfig
    };

    // set default metrics to false
    if (mergedChain.metrics === undefined) {
      mergedChain.metrics = false;
    }

    // Process faucet configuration
    const defaultFaucet = this.getFaucetDefaults('starship');
    const faucetConfig = {
      enabled: true,
      type: 'starship' as const,
      ...defaultFaucet,
      ...mergedChain.faucet
    };

    // Process cometmock configuration
    const cometmockConfig = {
      enabled: false,
      ...this.getDefaultCometmock(),
      ...mergedChain.cometmock
    };

    // Process upgrade/build settings
    const upgradeConfig = mergedChain.upgrade || { enabled: false };
    const buildConfig = mergedChain.build || { enabled: false };

    // Set image based on build requirements
    let image = mergedChain.image;
    if (mergedChain.build?.enabled || mergedChain.upgrade?.enabled) {
      image = 'ghcr.io/cosmology-tech/starship/runner:latest';
    }

    // Process scripts - merge default scripts with chain-specific scripts
    const defaultScripts = this.getDefaultScripts();
    const chainDefaultScripts = defaultChain?.scripts || {};
    const scripts = {
      ...defaultScripts,
      ...chainDefaultScripts,
      ...mergedChain.scripts
    };

    return {
      ...mergedChain,
      image,
      faucet: faucetConfig,
      cometmock: cometmockConfig,
      upgrade: upgradeConfig,
      build: buildConfig,
      scripts
    } as Chain;
  }

  /**
   * Get all available chain types from defaults
   */
  getAvailableChainTypes(): string[] {
    return Object.keys(this.defaultsData.defaultChains || {});
  }

  /**
   * Check if a chain type is supported
   */
  isChainTypeSupported(chainName: string): boolean {
    return chainName in (this.defaultsData.defaultChains || {});
  }

  /**
   * Get all defaults data (for debugging or advanced usage)
   */
  getAllDefaults(): DefaultsConfig {
    return this.defaultsData;
  }
}

/**
 * Apply defaults to a StarshipConfig
 * This is a standalone function that processes all chains, relayers, and global configs
 */
export function applyDefaults(config: StarshipConfig): StarshipConfig {
  const defaultsManager = new DefaultsManager();

  // Process chains with defaults
  const processedChains: Chain[] = config.chains?.map((chain: Chain) =>
    defaultsManager.processChain(chain)
  );

  // Process relayers with defaults
  let processedRelayers: Relayer[] = [];
  if (config.relayers && config.relayers?.length > 0) {
    processedRelayers = config.relayers.map((relayer: Relayer) =>
      defaultsManager.processRelayer(relayer)
    );
  }

  // Always apply global defaults, merge with existing config if present
  const processedConfig = {
    ...config,
    chains: processedChains,
    relayers: processedRelayers,

    // Always process global configurations with defaults
    exposer: defaultsManager.processExposer(config.exposer || {}),
    faucet: defaultsManager.processFaucet(config.faucet || {}),
    monitoring: defaultsManager.processMonitoring(config.monitoring || {}),
    ingress: defaultsManager.processIngress(config.ingress || {}),
    images: defaultsManager.processImages(config.images || {}),
    resources: defaultsManager.processResources(config.resources || {}),
    timeouts: defaultsManager.processTimeouts(config.timeouts || {}),

    // Optional configurations that only apply if defined
    ...(config.explorer && {
      explorer: defaultsManager.processExplorer(config.explorer)
    }),
    ...(config.registry && {
      registry: defaultsManager.processRegistry(config.registry)
    })
  };

  return processedConfig;
}
