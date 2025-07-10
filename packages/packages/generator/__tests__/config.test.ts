import { Relayer, StarshipConfig } from '@starship-ci/types';

import { applyDefaults, deepMerge, DefaultsManager } from '../src/defaults';

describe('DefaultsManager', () => {
  let defaultsManager: DefaultsManager;

  beforeEach(() => {
    defaultsManager = new DefaultsManager();
  });

  describe('applyDefaults', () => {
    it('should apply defaults to a full config', () => {
      const config: StarshipConfig = {
        name: 'test',
        chains: [
          {
            name: 'cosmoshub' as const,
            id: 'chain1',
            numValidators: 1,
            image: 'ghcr.io/hyperweb-io/starship/chain:xyz',
            faucet: {
              enabled: true,
              type: 'cosmjs',
              image: 'ghcr.io/hyperweb-io/starship/cosmjs-faucet:xyz'
            }
          }
        ],
        relayers: [],
      };

      const processedConfig = applyDefaults(config);

      expect(processedConfig.relayers).toHaveLength(0);
      expect(processedConfig.chains).toHaveLength(1);
      expect(processedConfig.chains![0].faucet?.enabled).toBe(true);
      expect(processedConfig.chains![0].faucet?.type).toBe('cosmjs');
      expect(processedConfig.chains![0].faucet?.image).toBe('ghcr.io/hyperweb-io/starship/cosmjs-faucet:xyz');
      expect(processedConfig.exposer?.image).toBe('ghcr.io/hyperweb-io/starship/exposer:20250205-544757d');
      expect(processedConfig.faucet?.enabled).toBe(true);
      expect(processedConfig.faucet?.image).toBe('ghcr.io/hyperweb-io/starship/faucet:20250325-2207109'); // default faucet
      expect(processedConfig.monitoring?.enabled).toBe(false);
      expect(processedConfig.ingress?.enabled).toBe(false);
      expect(processedConfig.ingress?.type).toBe('nginx');
      expect(processedConfig.images?.imagePullPolicy).toBe('IfNotPresent');
    });

    it('should override defaults with config', () => {
      const config: StarshipConfig = {
        name: 'test',
        chains: [],
        relayers: [],
        exposer: {
          image: 'ghcr.io/hyperweb-io/starship/exposer:xyz'
        },
        faucet: {
          enabled: true,
          type: 'starship',
          image: 'ghcr.io/hyperweb-io/starship/faucet:xyz'
        },
      };

      const processedConfig = applyDefaults(config);

      expect(processedConfig.exposer?.image).toBe('ghcr.io/hyperweb-io/starship/exposer:xyz');
      expect(processedConfig.faucet?.enabled).toBe(true);
      expect(processedConfig.faucet?.type).toBe('starship');
      expect(processedConfig.faucet?.image).toBe('ghcr.io/hyperweb-io/starship/faucet:xyz');
    });

    it('should process relayers in a full config', () => {
      const config: StarshipConfig = {
        name: 'test',
        chains: [],
        relayers: [
          {
            type: 'hermes' as const,
            name: 'test-hermes',
            replicas: 1,
            chains: ['chain1'],
            config: {
              rest: {
                port: 3001
              }
            }
          }
        ]
      };

      const processedConfig = applyDefaults(config);

      expect(processedConfig.relayers).toHaveLength(1);
      expect(processedConfig.relayers![0].config?.rest?.port).toBe(3001);
      expect(processedConfig.relayers![0].config?.rest?.host).toBe('0.0.0.0');
      expect(processedConfig.relayers![0].config?.rest?.enabled).toBe(true);
    });

    it('should handle config with no relayers', () => {
      const config: StarshipConfig = {
        name: 'test',
        chains: []
      };

      const processedConfig = applyDefaults(config);

      expect(processedConfig.relayers).toHaveLength(0);
    });
  });

  it('should override images in some cases', () => {
    const config: StarshipConfig = {
      name: 'test',
      chains: [
        {
          name: 'cosmoshub' as const,
          id: 'chain1',
          numValidators: 1,
          image: 'ghcr.io/hyperweb-io/starship/chain:xyz',
        },
        {
          name: 'osmosis' as const,
          id: 'chain2',
          numValidators: 1,
        }
      ],
      relayers: [
        {
          type: 'hermes' as const,
          name: 'test-hermes',
          chains: ['cosmoshub', 'osmosis'],
          replicas: 1,
          image: 'ghcr.io/hyperweb-io/starship/hermes:xyz'
        },
        {
          type: 'hermes' as const,
          name: 'test-hermes',
          chains: ['osmosis', 'cosmoshub'],
          replicas: 1,
        }
      ],
    };

    const processedConfig = applyDefaults(config);

    expect(processedConfig.relayers![0].image).toBe('ghcr.io/hyperweb-io/starship/hermes:xyz');
    expect(processedConfig.chains![0].image).toBe('ghcr.io/hyperweb-io/starship/chain:xyz');
    expect(processedConfig.relayers![1].image).toBe('ghcr.io/cosmology-tech/starship/hermes:1.10.0'); // default hermes image
    expect(processedConfig.chains![1].image).toBe('ghcr.io/cosmology-tech/starship/osmosis:v25.0.0'); // default osmosis image
  });

  describe('deepMerge utility', () => {
    it('should merge nested objects correctly', () => {
      const target = {
        a: 1,
        b: {
          c: 2,
          d: 3
        },
        e: [1, 2, 3]
      };

      const source = {
        b: {
          c: 4,
          f: 5
        },
        g: 6
      };

      const result = deepMerge(target, source);

      // Should merge nested objects
      expect(result.b.c).toBe(4); // Overridden
      expect(result.b.f).toBe(5); // Added
      expect(result.b.d).toBe(3); // Preserved
      expect(result.g).toBe(6); // Added
      expect(result.a).toBe(1); // Preserved
      expect(result.e).toEqual([1, 2, 3]); // Preserved (arrays are not merged)
    });

    it('should handle undefined values', () => {
      const target: any = {
        a: 1,
        b: {
          c: 2
        }
      };

      const source: any = {
        a: undefined,
        b: {
          c: undefined,
          d: 3
        }
      };

      const result = deepMerge(target, source);

      // Undefined values should not override existing values
      expect(result.a).toBe(1);
      expect(result.b.c).toBe(2);
      expect(result.b.d).toBe(3);
    });

    it('should handle null values', () => {
      const target: any = {
        a: 1,
        b: {
          c: 2
        }
      };

      const source: any = {
        a: null,
        b: {
          c: null,
          d: 3
        }
      };

      const result = deepMerge(target, source);

      // Null values should override existing values
      expect(result.a).toBe(null);
      expect(result.b.c).toBe(null);
      expect(result.b.d).toBe(3);
    });

    it('should handle empty objects', () => {
      const target = {};
      const source = {};

      const result = deepMerge(target, source);

      expect(result).toEqual({});
    });

    it('should handle primitive values', () => {
      const target = {
        a: 1,
        b: 'hello',
        c: true
      };

      const source = {
        a: 2,
        b: 'world',
        c: false,
        d: 3
      };

      const result = deepMerge(target, source);

      expect(result.a).toBe(2);
      expect(result.b).toBe('world');
      expect(result.c).toBe(false);
      expect(result.d).toBe(3);
    });
  });
});
