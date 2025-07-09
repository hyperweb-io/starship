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
    if (!explorerConfig) return undefined;

    const defaultExplorer = this.defaultsData.explorer || {};
    return deepMerge(defaultExplorer, explorerConfig);
  }

  /**
   * Process registry configuration by merging with defaults
   */
  processRegistry(registryConfig?: any): any {
    if (!registryConfig) return undefined;

    const defaultRegistry = this.defaultsData.registry || {};
    return deepMerge(defaultRegistry, registryConfig);
  }

  /**
   * Process faucet configuration by merging with defaults
   */
  processFaucet(faucetConfig?: any): any {
    if (!faucetConfig) return undefined;

    const defaultFaucet = this.defaultsData.faucet || {};
    return deepMerge(defaultFaucet, faucetConfig);
  }

  /**
   * Process monitoring configuration by merging with defaults
   */
  processMonitoring(monitoringConfig?: any): any {
    if (!monitoringConfig) return undefined;

    const defaultMonitoring = this.defaultsData.monitoring || {};
    return deepMerge(defaultMonitoring, monitoringConfig);
  }

  /**
   * Process ingress configuration by merging with defaults
   */
  processIngress(ingressConfig?: any): any {
    if (!ingressConfig) return undefined;

    const defaultIngress = this.defaultsData.ingress || {};
    return deepMerge(defaultIngress, ingressConfig);
  }

  /**
   * Process exposer configuration by merging with defaults
   */
  processExposer(exposerConfig?: Exposer): Exposer {
    if (!exposerConfig) return undefined;

    const defaultExposer = this.defaultsData.exposer || {};
    return deepMerge(defaultExposer, exposerConfig);
  }

  /**
   * Process images configuration by merging with defaults
   */
  processImages(imagesConfig?: any): any {
    if (!imagesConfig) return undefined;

    const defaultImages = this.defaultsData.images || {};
    return deepMerge(defaultImages, imagesConfig);
  }

  /**
   * Process resources configuration by merging with defaults
   */
  processResources(resourcesConfig?: any): any {
    if (!resourcesConfig) return undefined;

    const defaultResources = this.defaultsData.resources || {};
    return deepMerge(defaultResources, resourcesConfig);
  }

  /**
   * Process timeouts configuration by merging with defaults
   */
  processTimeouts(timeoutsConfig?: any): any {
    if (!timeoutsConfig) return undefined;

    const defaultTimeouts = this.defaultsData.timeouts || {};
    return deepMerge(defaultTimeouts, timeoutsConfig);
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
  let processedRelayers: Relayer[] | undefined;
  if (config.relayers && config.relayers?.length > 0) {
    processedRelayers = config.relayers.map((relayer: Relayer) =>
      defaultsManager.processRelayer(relayer)
    );
  }

  console.log('input config:', config);

  // Process global configurations individually to maintain type safety
  const processedConfig = {
    ...config,
    chains: processedChains,
    relayers: processedRelayers,
    ...(config.explorer && {
      explorer: defaultsManager.processExplorer(config.explorer)
    }),
    ...(config.registry && {
      registry: defaultsManager.processRegistry(config.registry)
    }),
    ...(config.faucet && {
      faucet: defaultsManager.processFaucet(config.faucet)
    }),
    ...(config.monitoring && {
      monitoring: defaultsManager.processMonitoring(config.monitoring)
    }),
    ...(config.ingress && {
      ingress: defaultsManager.processIngress(config.ingress)
    }),
    ...(config.exposer && {
      exposer: defaultsManager.processExposer(config.exposer)
    }),
    ...(config.images && {
      images: defaultsManager.processImages(config.images)
    }),
    ...(config.resources && {
      resources: defaultsManager.processResources(config.resources)
    }),
    ...(config.timeouts && {
      timeouts: defaultsManager.processTimeouts(config.timeouts)
    })
  };

  console.log('processedConfig:', processedConfig);

  return processedConfig;
}
