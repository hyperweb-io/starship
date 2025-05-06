import axios from 'axios';

interface ChainRegistry {
  chainId: string;
  chainName: string;
  prettyName?: string;
  apis: {
    rpc: Array<{ address: string }>;
    grpc: Array<{ address: string }>;
    rest: Array<{ address: string }>;
  };
}

interface Peers {
  seeds: any[];
  persistentPeers: any[];
}

interface APIs {
  rpc: Array<{ address: string }>;
  grpc: Array<{ address: string }>;
  rest: Array<{ address: string }>;
}

interface ChainAssets {
  chainName: string;
  assets: any[];
}

describe('Registry Tests', () => {
  const config = (global as any).testConfig;

  const makeRegistryRequest = async <T>(endpoint: string): Promise<T> => {
    if (!config.registry?.enabled) {
      throw new Error('Registry not enabled');
    }

    const url = `http://localhost:${config.registry.ports.rest}${endpoint}`;
    const response = await axios.get(url);
    return response.data;
  };

  it('should list chain IDs', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    const response = await makeRegistryRequest<{ chainIds: string[] }>('/chain_ids');
    expect(response.chainIds).toHaveLength(config.chains.length);
  });

  it('should list chains', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    const response = await makeRegistryRequest<{ chains: ChainRegistry[] }>('/chains');
    expect(response.chains).toHaveLength(config.chains.length);

    for (const chain of response.chains) {
      const expChain = config.chains.find((c: any) => c.id === chain.chainId);
      expect(expChain).toBeTruthy();

      if (expChain.name === 'custom') {
        expect(expChain.id).toBe(chain.chainName);
      } else {
        expect(expChain.name).toBe(chain.chainName);
      }
    }
  });

  it('should get chain details', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    for (const chain of config.chains) {
      const response = await makeRegistryRequest<ChainRegistry>(`/chains/${chain.id}`);
      expect(response.chainId).toBe(chain.id);

      if (chain.name === 'custom') {
        expect(chain.id).toBe(response.chainName);
      } else {
        expect(chain.name).toBe(response.chainName);
      }

      if (chain.ports.rpc) {
        expect(response.apis.rpc[0].address).toBe(`http://localhost:${chain.ports.rpc}`);
      }
      if (chain.ports.grpc) {
        expect(response.apis.grpc[0].address).toBe(`http://localhost:${chain.ports.grpc}`);
      }
      if (chain.ports.rest) {
        expect(response.apis.rest[0].address).toBe(`http://localhost:${chain.ports.rest}`);
      }

      if (chain.name === 'osmosis') {
        expect(response.prettyName).toBe('Osmosis Devnet');
      }
    }
  });

  it('should list chain peers', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    for (const chain of config.chains) {
      const response = await makeRegistryRequest<Peers>(`/chains/${chain.id}/peers`);
      expect(response.seeds).toHaveLength(1);
      expect(response.persistentPeers).toHaveLength(chain.numValidators - 1);
    }
  });

  it('should list chain APIs', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    for (const chain of config.chains) {
      const response = await makeRegistryRequest<APIs>(`/chains/${chain.id}/apis`);
      expect(response.rpc).toHaveLength(1);
      if (chain.ports.rpc) {
        expect(response.rpc[0].address).toBe(`http://localhost:${chain.ports.rpc}`);
      }

      expect(response.rest).toHaveLength(1);
      if (chain.ports.rest) {
        expect(response.rest[0].address).toBe(`http://localhost:${chain.ports.rest}`);
      }

      expect(response.grpc).toHaveLength(1);
      if (chain.ports.grpc) {
        expect(response.grpc[0].address).toBe(`http://localhost:${chain.ports.grpc}`);
      }
    }
  });

  it('should get chain assets', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    const expectedAssets: Record<string, number> = {
      osmosis: 2,
      cosmos: 1,
      agoric: 2,
    };

    for (const chain of config.chains) {
      const response = await makeRegistryRequest<ChainAssets>(`/chains/${chain.id}/assets`);
      const chainName = chain.name === 'custom' ? chain.id : chain.name;
      expect(response.chainName).toBe(chainName);

      const expNumAssets = expectedAssets[chainName] || 1;
      expect(response.assets).toHaveLength(expNumAssets);
    }
  });

  it('should get osmosis chain assets', async () => {
    if (!config.registry?.enabled) {
      return;
    }

    const osmosisChain = config.chains.find((c: any) => c.id === 'osmosis-1');
    if (!osmosisChain) {
      return;
    }

    const response = await makeRegistryRequest<ChainAssets>('/chains/osmosis-1/assets');
    expect(response.chainName).toBe('osmosis');
    expect(response.assets).toHaveLength(2);

    const osmoAsset = response.assets.find((a: any) => a.base === 'uosmo');
    expect(osmoAsset).toBeTruthy();
    expect(osmoAsset.name).toBe('Osmosis');
    expect(osmoAsset.display).toBe('osmo');
    expect(osmoAsset.symbol).toBe('OSMO');

    const ionAsset = response.assets.find((a: any) => a.base === 'uion');
    expect(ionAsset).toBeTruthy();
    expect(ionAsset.name).toBe('Ion');
    expect(ionAsset.display).toBe('ion');
    expect(ionAsset.symbol).toBe('ION');
  });
}); 