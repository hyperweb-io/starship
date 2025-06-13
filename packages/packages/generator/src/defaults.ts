import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Chain, FaucetConfig, Script } from '@starship-ci/types';
import { ProcessedChain, DefaultsConfig } from './types';
import { TemplateHelpers } from './helpers';

export class DefaultsManager {
  private defaultsData: DefaultsConfig;
  private defaultsPath: string;

  constructor(defaultsPath?: string) {
    // Default to the configs/defaults.yaml in the generator package
    this.defaultsPath = defaultsPath || path.join(__dirname, '../configs/defaults.yaml');
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
        console.warn(`Defaults file not found at ${this.defaultsPath}, using empty defaults`);
        this.defaultsData = {
          defaultChains: {},
          defaultFaucet: {},
          defaultRelayers: {},
          defaultScripts: {},
          defaultCometmock: { image: 'ghcr.io/informalsystems/cometmock:v0.37.x' }
        };
      }
    } catch (error) {
      console.error('Failed to load defaults.yaml:', error);
      this.defaultsData = {
        defaultChains: {},
        defaultFaucet: {},
        defaultRelayers: {},
        defaultScripts: {},
        defaultCometmock: { image: 'ghcr.io/informalsystems/cometmock:v0.37.x' }
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
   * Get default cometmock configuration
   */
  getDefaultCometmock(): any {
    return this.defaultsData.defaultCometmock || {};
  }

  /**
   * Process a chain configuration by merging with defaults
   * This replaces the complex _chains.tpl logic
   */
  processChain(chainConfig: Chain): ProcessedChain {
    // Get default chain configuration
    const defaultChain = this.getChainDefaults(chainConfig.name);
    
    // Merge configurations (chain config takes precedence)
    const mergedChain = {
      ...defaultChain,
      ...chainConfig,
    };

    // Set computed properties
    const hostname = TemplateHelpers.chainName(String(chainConfig.id));
    const toBuild = chainConfig.build?.enabled || chainConfig.upgrade?.enabled || false;

    // Process faucet configuration
    const defaultFaucet = this.getFaucetDefaults('starship');
    const faucetConfig = {
      enabled: true,
      type: 'starship' as const,
      ...defaultFaucet,
      ...mergedChain.faucet,
    };

    // Process cometmock configuration
    const cometmockConfig = {
      enabled: false,
      ...this.getDefaultCometmock(),
      ...mergedChain.cometmock,
    };

    // Process upgrade/build settings
    const upgradeConfig = mergedChain.upgrade || { enabled: false };
    const buildConfig = mergedChain.build || { enabled: false };

    // Set image based on build requirements
    let image = mergedChain.image;
    if (toBuild) {
      image = 'ghcr.io/cosmology-tech/starship/runner:latest';
    }

    // Process scripts - merge default scripts with chain-specific scripts
    const defaultScripts = this.getDefaultScripts();
    const chainDefaultScripts = defaultChain?.scripts || {};
    const scripts = {
      ...defaultScripts,
      ...chainDefaultScripts,
      ...mergedChain.scripts,
    };

    return {
      ...mergedChain,
      hostname,
      toBuild,
      image,
      faucet: faucetConfig,
      cometmock: cometmockConfig,
      upgrade: upgradeConfig,
      build: buildConfig,
      scripts,
    } as ProcessedChain;
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