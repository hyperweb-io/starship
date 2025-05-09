import axios from 'axios';

import { StarshipConfig } from '../src/config';
import { createClient, expectClient } from '../test-utils/client';
import { config } from '../test-utils/config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StarshipClient verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify all services successfully', async () => {
    const { client, ctx } = createClient();
    client.dependencies.forEach((dep) => (dep.installed = true));
    client.setConfig(config.config);

    // Mock successful responses for all services
    mockedAxios.get.mockImplementation((url) => {
      // Chain REST check (port 1317, 1313)
      if (url.includes('/cosmos/bank/v1beta1/supply')) {
        return Promise.resolve({
          status: 200,
          data: {
            supply: [{ amount: '1000000' }]
          }
        });
      }

      // Chain RPC check (port 26657, 26653)
      if (
        url.includes('/status') &&
        (url.includes('26657') || url.includes('26653'))
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            result: {
              sync_info: {
                latest_block_height: '100'
              }
            }
          }
        });
      }

      // Chain faucet check (port 8007, 8003)
      if (
        url.includes('/status') &&
        (url.includes('8007') || url.includes('8003'))
      ) {
        // Extract port from URL
        const port = url.includes('8007') ? 8007 : 8003;
        // Find the chain ID based on the port
        const chain = config.config.chains?.find(
          (chain) => chain.ports?.faucet === port
        );
        return Promise.resolve({
          status: 200,
          data: {
            chainId: chain?.id || 'unknown'
          }
        });
      }

      // Registry check (port 8081)
      if (url.includes('/chains')) {
        return Promise.resolve({
          status: 200,
          data: {
            chains: config.config.chains?.map((chain) => chain.id) || []
          }
        });
      }

      // Explorer check (port 8080)
      if (url.includes('8080')) {
        return Promise.resolve({
          status: 200,
          data: '<html><body>Ping Dashboard</body></html>'
        });
      }

      // Throw error for unhandled URLs
      throw new Error(`Unhandled URL in mock: ${url}`);
    });

    await client.verify();
    expectClient(ctx, 0);
  });

  it('should handle registry verification failure', async () => {
    const { client, ctx } = createClient();
    client.dependencies.forEach((dep) => (dep.installed = true));
    client.setConfig(config.config);

    // Mock registry failure
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/chains')) {
        return Promise.reject(new Error('Registry not available'));
      }

      // Throw error for unhandled URLs
      throw new Error(`Unhandled URL in mock: ${url}`);
    });

    await client.verify();
    expectClient(ctx, 1);
  });

  it('should handle explorer verification failure', async () => {
    const { client, ctx } = createClient();
    client.dependencies.forEach((dep) => (dep.installed = true));
    client.setConfig(config.config);

    // Mock explorer failure
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('8080')) {
        return Promise.reject(new Error('Explorer not available'));
      }

      // Throw error for unhandled URLs
      throw new Error(`Unhandled URL in mock: ${url}`);
    });

    await client.verify();
    expectClient(ctx, 1);
  });

  it('should handle relayer verification failure', async () => {
    const { client, ctx } = createClient();
    client.dependencies.forEach((dep) => (dep.installed = true));
    client.setConfig(config.config);

    // Mock relayer failure
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/version')) {
        return Promise.reject(new Error('Relayer not available'));
      }

      // Throw error for unhandled URLs
      throw new Error(`Unhandled URL in mock: ${url}`);
    });

    await client.verify();
    expectClient(ctx, 1);
  });

  it('should skip disabled services', async () => {
    const { client, ctx } = createClient();
    client.dependencies.forEach((dep) => (dep.installed = true));

    // Create config with disabled services
    const disabledConfig: StarshipConfig = {
      ...config.config,
      explorer: {
        ...config.config.explorer,
        enabled: false
      },
      registry: {
        ...config.config.registry,
        enabled: false
      }
    };
    client.setConfig(disabledConfig);

    // Mock successful responses for enabled services
    mockedAxios.get.mockImplementation((url) => {
      // Chain REST check (port 1317, 1313)
      if (url.includes('/cosmos/bank/v1beta1/supply')) {
        return Promise.resolve({
          status: 200,
          data: {
            supply: [{ amount: '1000000' }]
          }
        });
      }

      // Chain RPC check (port 26657, 26653)
      if (
        url.includes('/status') &&
        (url.includes('26657') || url.includes('26653'))
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            result: {
              sync_info: {
                latest_block_height: '100'
              }
            }
          }
        });
      }

      // Chain faucet check (port 8007, 8003)
      if (
        url.includes('/status') &&
        (url.includes('8007') || url.includes('8003'))
      ) {
        // Extract port from URL
        const port = url.includes('8007') ? 8007 : 8003;
        // Find the chain ID based on the port
        const chain = disabledConfig.chains?.find(
          (chain) => chain.ports?.faucet === port
        );
        return Promise.resolve({
          status: 200,
          data: {
            chainId: chain?.id || 'unknown'
          }
        });
      }

      // Throw error for unhandled URLs
      throw new Error(`Unhandled URL in mock: ${url}`);
    });

    await client.verify();
    expectClient(ctx, 0);
  });
});
