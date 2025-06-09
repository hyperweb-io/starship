import { StarshipConfig } from '../config';

export interface ServiceUrl {
  baseUrl: string;
  path: string;
}

export const getServiceUrl = (
  config: StarshipConfig,
  service: string,
  endpoint: string,
  chainId?: string
): ServiceUrl => {
  const useIngress = config.ingress?.enabled && config.ingress?.host;
  let host = 'localhost';
  if (useIngress && config.ingress) {
    host = config.ingress.host.replace('*.', '');
  }

  switch (service) {
    case 'chain': {
      if (!chainId) throw new Error('Chain ID is required for chain service');
      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not found`);

      const port = chain.ports?.[endpoint];
      if (!port) throw new Error(`Port not found for ${endpoint}`);

      if (useIngress) {
        switch (endpoint) {
          case 'rest':
            return {
              baseUrl: `https://rest.${chainId}-genesis.${host}`,
              path: '/cosmos/bank/v1beta1/supply'
            };
          case 'rpc':
            return {
              baseUrl: `https://rpc.${chainId}-genesis.${host}`,
              path: '/status'
            };
          case 'faucet':
            return {
              baseUrl: `https://rest.${chainId}-genesis.${host}`,
              path: '/faucet/status'
            };
          case 'exposer':
            return {
              baseUrl: `https://rest.${chainId}-genesis.${host}`,
              path: '/exposer/node_id'
            };
          default:
            throw new Error(`Unknown endpoint ${endpoint} for chain service`);
        }
      }

      return {
        baseUrl: `http://localhost:${port}`,
        path:
          endpoint === 'rest'
            ? '/cosmos/bank/v1beta1/supply'
            : endpoint === 'rpc'
              ? '/status'
              : endpoint === 'faucet'
                ? '/status'
                : endpoint === 'exposer'
                  ? '/node_id'
                  : ''
      };
    }

    case 'relayer': {
      if (!chainId) throw new Error('Chain ID is required for relayer service');
      const relayer = config.relayers?.find((r) => r.chains.includes(chainId));
      if (!relayer) throw new Error(`Relayer for chain ${chainId} not found`);

      const port = relayer.ports?.[endpoint];
      if (!port) throw new Error(`Port not found for ${endpoint}`);

      if (useIngress) {
        switch (endpoint) {
          case 'rest':
            return {
              baseUrl: `https://rest.${relayer.type}-${relayer.name}.${host}`,
              path: '/status'
            };
          case 'exposer':
            return {
              baseUrl: `https://rest.${relayer.type}-${relayer.name}.${host}`,
              path: '/exposer/config'
            };
          default:
            throw new Error(`Unknown endpoint ${endpoint} for relayer service`);
        }
      }

      return {
        baseUrl: `http://localhost:${port}`,
        path:
          endpoint === 'rest'
            ? '/status'
            : endpoint === 'exposer'
              ? '/config'
              : ''
      };
    }

    case 'registry': {
      const port = config.registry?.ports?.rest;
      if (!port) throw new Error('Registry REST port not found');

      if (useIngress) {
        return {
          baseUrl: `https://registry.${host}`,
          path: '/chains'
        };
      }

      return {
        baseUrl: `http://localhost:${port}`,
        path: '/chains'
      };
    }

    case 'explorer': {
      const port = config.explorer?.ports?.http;
      if (!port) throw new Error('Explorer HTTP port not found');

      if (useIngress) {
        return {
          baseUrl: `https://explorer.${host}`,
          path: ''
        };
      }

      return {
        baseUrl: `http://localhost:${port}`,
        path: ''
      };
    }

    default:
      throw new Error(`Unknown service ${service}`);
  }
};
