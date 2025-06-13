import { StarshipConfig } from '@starship-ci/types';
import { ProcessedChain, EnvVar } from './types';

export class TemplateHelpers {
  /**
   * Convert chain.id to name usable by templates
   * Replaces underscores with hyphens and truncates to 63 chars
   */
  static chainName(chainId: string): string {
    return chainId.replace(/_/g, '-').substring(0, 63);
  }

  /**
   * Create a default fully qualified app name
   */
  static fullname(config: StarshipConfig): string {
    // Use the name from StarshipConfig
    const releaseName = config.name || 'starship';
    return releaseName.substring(0, 63).replace(/-$/, '');
  }

  /**
   * Common labels for all resources
   */
  static commonLabels(config: StarshipConfig): Record<string, string> {
    return {
      'helm.sh/chart': `devnet-${config.version || '1.8.0'}`,
      ...this.selectorLabels(config),
      'app.kubernetes.io/version': config.version || '1.8.0',
      'app.kubernetes.io/managed-by': 'starship-generator',
    };
  }

  /**
   * Selector labels for resources
   */
  static selectorLabels(config: StarshipConfig): Record<string, string> {
    return {
      'app.kubernetes.io/name': this.fullname(config),
      'app.kubernetes.io/instance': config.name || 'starship',
    };
  }

  /**
   * Default environment variables for chain containers
   */
  static defaultEnvVars(chain: ProcessedChain): EnvVar[] {
    return [
      { name: 'DENOM', value: chain.denom || '' },
      { name: 'COINS', value: chain.coins || '' },
      { name: 'CHAIN_BIN', value: chain.binary || '' },
      { name: 'CHAIN_DIR', value: chain.home || '' },
      { name: 'CODE_REPO', value: chain.repo || '' },
      { name: 'DAEMON_HOME', value: chain.home || '' },
      { name: 'DAEMON_NAME', value: chain.binary || '' },
    ];
  }

  /**
   * Chain-specific environment variables
   */
  static chainEnvVars(chain: ProcessedChain): EnvVar[] {
    return [
      { name: 'CHAIN_ID', value: String(chain.id) },
    ];
  }

  /**
   * Timeout environment variables
   */
  static timeoutVars(timeouts: Record<string, any>): EnvVar[] {
    const envVars: EnvVar[] = [];
    
    for (const [key, value] of Object.entries(timeouts)) {
      envVars.push({
        name: key.toUpperCase(),
        value: String(value),
      });
    }
    
    return envVars;
  }

  /**
   * Genesis-specific environment variables
   */
  static genesisVars(chain: ProcessedChain, port: number): EnvVar[] {
    return [
      { name: 'GENESIS_HOST', value: `${chain.hostname}-genesis` },
      { name: 'GENESIS_PORT', value: String(port) },
      {
        name: 'NAMESPACE',
        value: {
          valueFrom: {
            fieldRef: {
              fieldPath: 'metadata.namespace',
            },
          },
        },
      },
    ];
  }

  /**
   * Get resource object based on input
   * Handles both simple cpu/memory format and full k8s resource format
   */
  static getResourceObject(resources: any): any {
    if (!resources) {
      return {};
    }

    if (resources.cpu && resources.memory) {
      // Simple format: { cpu: "0.5", memory: "500M" }
      return {
        limits: {
          cpu: resources.cpu,
          memory: resources.memory,
        },
        requests: {
          cpu: resources.cpu,
          memory: resources.memory,
        },
      };
    }

    // Full k8s format
    return resources;
  }

  /**
   * Get node resources with chain-specific overrides
   */
  static nodeResources(chain: ProcessedChain, context: StarshipConfig): any {
    if (chain.resources) {
      return this.getResourceObject(chain.resources);
    }
    
    return this.getResourceObject(context.resources?.node || {
      cpu: '0.5',
      memory: '500M',
    });
  }
} 