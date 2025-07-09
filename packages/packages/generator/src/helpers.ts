import { Chain, Resources, StarshipConfig } from '@starship-ci/types';
import { Container, EnvVar, ResourceRequirements, Volume } from 'kubernetesjs';

import { getGeneratorVersion } from './version';

/**
 * Convert chain.id to name usable by templates
 * Replaces underscores with hyphens and truncates to 63 chars
 */
export function getChainName(chainId: string | number): string {
  return String(chainId).replace(/_/g, '-').substring(0, 63);
}

/**
 * Create a default fully qualified app name
 */
export function getReleaseName(config: StarshipConfig): string {
  // Use the name from StarshipConfig
  const releaseName = config.name || 'starship';
  return releaseName.substring(0, 63).replace(/-$/, '');
}

/**
 * Common labels for all resources
 */
export function getCommonLabels(
  config: StarshipConfig
): Record<string, string> {
  return {
    ...getSelectorLabels(config),
    'app.kubernetes.io/version': getGeneratorVersion(),
    'app.kubernetes.io/managed-by': 'starship'
  };
}

/**
 * Selector labels for resources
 */
export function getSelectorLabels(
  config: StarshipConfig
): Record<string, string> {
  return {
    'starship.io/name': config.name
  };
}

/**
 * Default environment variables for chain containers
 */
export function getDefaultEnvVars(chain: Chain): EnvVar[] {
  return [
    { name: 'DENOM', value: chain.denom || '' },
    { name: 'COINS', value: chain.coins || '' },
    { name: 'CHAIN_BIN', value: chain.binary || '' },
    { name: 'CHAIN_DIR', value: chain.home || '' },
    { name: 'CODE_REPO', value: chain.repo || '' },
    { name: 'DAEMON_HOME', value: chain.home || '' },
    { name: 'DAEMON_NAME', value: chain.binary || '' }
  ];
}

/**
 * Chain-specific environment variables
 */
export function getChainEnvVars(chain: Chain): EnvVar[] {
  return [{ name: 'CHAIN_ID', value: String(chain.id) }];
}

/**
 * Timeout environment variables
 */
export function getTimeoutEnvVars(timeouts: Record<string, any>): EnvVar[] {
  const envVars: EnvVar[] = [];

  for (const [key, value] of Object.entries(timeouts)) {
    envVars.push({
      name: key.toUpperCase(),
      value: String(value)
    });
  }

  return envVars;
}

/**
 * Genesis-specific environment variables
 */
export function getGenesisEnvVars(chain: Chain, port: number): EnvVar[] {
  return [
    {
      name: 'GENESIS_HOST',
      value: `${getChainName(String(chain.id))}-genesis`
    },
    { name: 'GENESIS_PORT', value: String(port) },
    {
      name: 'NAMESPACE',
      valueFrom: {
        fieldRef: {
          fieldPath: 'metadata.namespace'
        }
      }
    }
  ];
}

/**
 * Get resource object based on input
 * Handles both simple cpu/memory format and full k8s resource format
 */
export function getResourceObject(resources: Resources): ResourceRequirements {
  if (!resources) {
    return {};
  }

  if (resources.cpu && resources.memory) {
    // Simple format: { cpu: "0.5", memory: "500M" }
    return {
      limits: {
        cpu: resources.cpu,
        memory: resources.memory
      },
      requests: {
        cpu: resources.cpu,
        memory: resources.memory
      }
    };
  }

  // Full k8s format
  return resources;
}

/**
 * Get node resources with chain-specific overrides
 */
export function getNodeResources(
  chain: Chain,
  context: StarshipConfig
): ResourceRequirements {
  if (chain.resources) {
    return getResourceObject(chain.resources);
  }

  return getResourceObject(
    context.resources?.node || {
      cpu: '0.5',
      memory: '500M'
    }
  );
}

/**
 * Standard port mappings for Cosmos chains
 */
export function getPortMap(): Record<string, number> {
  return {
    p2p: 26656,
    address: 26658,
    grpc: 9090,
    'grpc-web': 9091,
    rest: 1317,
    rpc: 26657,
    metrics: 26660,
    exposer: 8081,
    faucet: 8000
  };
}

/**
 * Returns comma-separated list of chain IDs
 */
export function getChainIds(chains: Chain[]): string {
  return chains.map((chain) => chain.id).join(',');
}

/**
 * Returns comma-separated list of chain names
 * If chain name is custom, use chain id instead
 */
export function getChainNames(chains: Chain[]): string {
  return chains
    .map((chain) => (chain.name === 'custom' ? chain.id : chain.name))
    .join(',');
}

/**
 * Returns comma-separated list of internal RPC addresses
 */
export function getChainInternalRpcAddrs(chains: Chain[]): string {
  return chains
    .map(
      (chain) =>
        `http://${getChainName(String(chain.id))}-genesis.$(NAMESPACE).svc.cluster.local:26657`
    )
    .join(',');
}

/**
 * Returns comma-separated list of RPC addresses
 */
export function getChainRpcAddrs(
  chains: Chain[],
  config: StarshipConfig
): string {
  const localhost = config.registry?.localhost;
  const ingress = config.ingress;

  return chains
    .map((chain) => {
      if (localhost && chain.ports?.rpc) {
        return `http://localhost:${chain.ports.rpc}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://rpc.${chain.id}-genesis.${host}`;
      } else {
        return `http://${getChainName(String(chain.id))}-genesis.$(NAMESPACE).svc.cluster.local:26657`;
      }
    })
    .join(',');
}

/**
 * Returns comma-separated list of GRPC addresses
 */
export function getChainGrpcAddrs(
  chains: Chain[],
  config: StarshipConfig
): string {
  const localhost = config.registry?.localhost;
  const ingress = config.ingress;

  return chains
    .map((chain) => {
      if (localhost && chain.ports?.grpc) {
        return `http://localhost:${chain.ports.grpc}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://grpc.${chain.id}-genesis.${host}`;
      } else {
        return `http://${getChainName(String(chain.id))}-genesis.$(NAMESPACE).svc.cluster.local:9091`;
      }
    })
    .join(',');
}

/**
 * Returns comma-separated list of REST addresses
 */
export function getChainRestAddrs(
  chains: Chain[],
  config: StarshipConfig
): string {
  const localhost = config.registry?.localhost;
  const ingress = config.ingress;

  return chains
    .map((chain) => {
      if (localhost && chain.ports?.rest) {
        return `http://localhost:${chain.ports.rest}`;
      } else if (ingress?.enabled && ingress.host) {
        const host = ingress.host.replace('*.', '');
        return `https://rest.${chain.id}-genesis.${host}`;
      } else {
        return `http://${getChainName(String(chain.id))}-genesis.$(NAMESPACE).svc.cluster.local:1317`;
      }
    })
    .join(',');
}

/**
 * Returns comma-separated list of exposer addresses
 */
export function getChainExposerAddrs(
  chains: Chain[],
  port: number = 8081
): string {
  return chains
    .map(
      (chain) =>
        `http://${getChainName(String(chain.id))}-genesis.$(NAMESPACE).svc.cluster.local:${port}`
    )
    .join(',');
}

/**
 * Generate init container for waiting on chains to be ready
 */
export function generateWaitInitContainer(
  chainIDs: string[],
  port: number,
  config?: StarshipConfig
): Container {
  const waitScript = chainIDs
    .map(
      (chainID) => `
while [ $(curl -sw '%{http_code}' http://${getChainName(String(chainID))}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id -o /dev/null) -ne 200 ]; do
  echo "Genesis validator does not seem to be ready for: ${chainID}. Waiting for it to start..."
  echo "Checking: http://${getChainName(String(chainID))}-genesis.$NAMESPACE.svc.cluster.local:$GENESIS_PORT/node_id"
  sleep 10;
done`
    )
    .join('\n');

  return {
    name: 'wait-for-chains',
    image: 'curlimages/curl:latest',
    imagePullPolicy: config?.images?.imagePullPolicy || 'IfNotPresent',
    env: [
      { name: 'GENESIS_PORT', value: String(port) },
      {
        name: 'NAMESPACE',
        valueFrom: {
          fieldRef: {
            fieldPath: 'metadata.namespace'
          }
        }
      }
    ],
    command: ['/bin/sh', '-c', `${waitScript}\necho "Ready to start"\nexit 0`],
    resources: getResourceObject(
      config?.resources?.wait || { cpu: '0.1', memory: '128M' }
    )
  };
}

/**
 * Generate image pull secrets
 */
export function generateImagePullSecrets(
  imagePullSecrets?: Array<{ name: string }>
): any {
  if (!imagePullSecrets || imagePullSecrets.length === 0) {
    return null;
  }

  return {
    imagePullSecrets: imagePullSecrets.map((secret) => ({
      name: secret.name
    }))
  };
}

/**
 * Extract tag from docker image
 */
export function extractImageTag(image: string): string {
  const match = image.match(/[^:]+$/);
  return match ? match[0] : 'latest';
}

/**
 * Generate volume mounts for chain containers
 */
export function generateChainVolumeMounts(chain: Chain): any[] {
  return [
    {
      mountPath: chain.home,
      name: 'node'
    },
    {
      mountPath: '/configs',
      name: 'addresses'
    },
    {
      mountPath: '/scripts',
      name: 'scripts'
    }
  ];
}

/**
 * Generate standard volumes for chain pods
 */
export function generateChainVolumes(chain: Chain): Volume[] {
  const volumes = [
    {
      name: 'node',
      emptyDir: {}
    },
    {
      name: 'addresses',
      configMap: {
        name: 'keys'
      }
    },
    {
      name: 'scripts',
      configMap: {
        name: `setup-scripts-${getChainName(String(chain.id))}`
      }
    }
  ];

  // Add patch volume if genesis override exists
  if (chain.genesis) {
    volumes.push({
      name: 'patch',
      configMap: {
        name: `patch-${getChainName(String(chain.id))}`
      }
    });
  }

  // Add faucet volume if starship faucet is enabled
  if (chain.faucet?.enabled && chain.faucet.type === 'starship') {
    volumes.push({
      name: 'faucet',
      emptyDir: {}
    });
  }

  // Add proposal volume if ICS is enabled
  if (chain.ics?.enabled) {
    volumes.push({
      name: 'proposal',
      configMap: {
        name: `consumer-proposal-${getChainName(String(chain.id))}`
      }
    });
  }

  return volumes;
}

export function getHostname(chain: Chain): string {
  return getChainName(String(chain.id));
}

export function getChainId(chain: Chain): string {
  return String(chain.id);
}
