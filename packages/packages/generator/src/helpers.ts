import { StarshipConfig } from '@starship-ci/types/src';
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

  /**
   * Standard port mappings for Cosmos chains
   */
  static getPortMap(): Record<string, number> {
    return {
      p2p: 26656,
      address: 26658,
      grpc: 9090,
      'grpc-web': 9091,
      rest: 1317,
      rpc: 26657,
      metrics: 26660,
      exposer: 8081,
      faucet: 8000,
    };
  }

  /**
   * Returns comma-separated list of chain IDs
   */
  static chainIds(chains: ProcessedChain[]): string {
    return chains.map(chain => chain.id).join(',');
  }

  /**
   * Returns comma-separated list of chain names
   * If chain name is custom, use chain id instead
   */
  static chainNames(chains: ProcessedChain[]): string {
    return chains.map(chain => 
      chain.name === 'custom' ? chain.id : chain.name
    ).join(',');
  }

  /**
   * Returns comma-separated list of internal RPC addresses
   */
  static chainInternalRpcAddrs(chains: ProcessedChain[]): string {
    return chains.map(chain => 
      `http://${chain.hostname}-genesis.$(NAMESPACE).svc.cluster.local:26657`
    ).join(',');
  }

  /**
   * Returns comma-separated list of RPC addresses
   */
  static chainRpcAddrs(chains: ProcessedChain[], config: StarshipConfig): string {
    const localhost = config.registry?.localhost;
    const ingress = config.ingress;
    
    return chains.map(chain => {
      if (localhost && chain.ports?.rpc) {
        return `http://localhost:${chain.ports.rpc}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://rpc.${chain.id}-genesis.${host}`;
      } else {
        return `http://${chain.hostname}-genesis.$(NAMESPACE).svc.cluster.local:26657`;
      }
    }).join(',');
  }

  /**
   * Returns comma-separated list of GRPC addresses
   */
  static chainGrpcAddrs(chains: ProcessedChain[], config: StarshipConfig): string {
    const localhost = config.registry?.localhost;
    const ingress = config.ingress;
    
    return chains.map(chain => {
      if (localhost && chain.ports?.grpc) {
        return `http://localhost:${chain.ports.grpc}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://grpc.${chain.id}-genesis.${host}`;
      } else {
        return `http://${chain.hostname}-genesis.$(NAMESPACE).svc.cluster.local:9091`;
      }
    }).join(',');
  }

  /**
   * Returns comma-separated list of REST addresses
   */
  static chainRestAddrs(chains: ProcessedChain[], config: StarshipConfig): string {
    const localhost = config.registry?.localhost;
    const ingress = config.ingress;
    
    return chains.map(chain => {
      if (localhost && chain.ports?.rest) {
        return `http://localhost:${chain.ports.rest}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://rest.${chain.id}-genesis.${host}`;
      } else {
        return `http://${chain.hostname}-genesis.$(NAMESPACE).svc.cluster.local:1317`;
      }
    }).join(',');
  }

  /**
   * Returns comma-separated list of exposer addresses
   */
  static chainExposerAddrs(chains: ProcessedChain[], port: number = 8081): string {
    return chains.map(chain => 
      `http://${chain.hostname}-genesis.$(NAMESPACE).svc.cluster.local:${port}`
    ).join(',');
  }

  /**
   * Generate init container for waiting on chains to be ready
   */
  static generateWaitInitContainer(chains: ProcessedChain[], port: number, imagePullPolicy: string = 'IfNotPresent'): any {
    const waitScript = chains.map(chain => `
      while [ $(curl -sw '%{http_code}' http://${chain.hostname}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id -o /dev/null) -ne 200 ]; do
        echo "Genesis validator does not seem to be ready for: ${chain.id}. Waiting for it to start..."
        echo "Checking: http://${chain.hostname}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id"
        sleep 10;
      done`).join('\n');

    return {
      name: 'wait-for-chains',
      image: 'curlimages/curl',
      imagePullPolicy,
      env: [
        { name: 'GENESIS_PORT', value: String(port) },
        {
          name: 'NAMESPACE',
          valueFrom: {
            fieldRef: {
              fieldPath: 'metadata.namespace',
            },
          },
        },
      ],
      command: ['/bin/sh', '-c', `${waitScript}\necho "Ready to start"\nexit 0`],
      resources: this.getResourceObject({ cpu: '0.1', memory: '128M' }),
    };
  }

  /**
   * Generate image pull secrets
   */
  static generateImagePullSecrets(imagePullSecrets?: Array<{ name: string }>): any {
    if (!imagePullSecrets || imagePullSecrets.length === 0) {
      return null;
    }

    return {
      imagePullSecrets: imagePullSecrets.map(secret => ({ name: secret.name })),
    };
  }

  /**
   * Extract tag from docker image
   */
  static extractImageTag(image: string): string {
    const match = image.match(/[^:]+$/);
    return match ? match[0] : 'latest';
  }

  /**
   * Generate volume mounts for chain containers
   */
  static generateChainVolumeMounts(chain: ProcessedChain): any[] {
    return [
      {
        mountPath: chain.home,
        name: 'node',
      },
      {
        mountPath: '/configs',
        name: 'addresses',
      },
      {
        mountPath: '/scripts',
        name: 'scripts',
      },
    ];
  }

  /**
   * Generate standard volumes for chain pods
   */
  static generateChainVolumes(chain: ProcessedChain): any[] {
    const volumes = [
      {
        name: 'node',
        emptyDir: {},
      },
      {
        name: 'addresses',
        configMap: {
          name: 'keys',
        },
      },
      {
        name: 'scripts',
        configMap: {
          name: `setup-scripts-${chain.hostname}`,
        },
      },
    ];

    // Add patch volume if genesis override exists
    if (chain.genesis) {
      volumes.push({
        name: 'patch',
        configMap: {
          name: `patch-${chain.hostname}`,
        },
      });
    }

    return volumes;
  }
} 