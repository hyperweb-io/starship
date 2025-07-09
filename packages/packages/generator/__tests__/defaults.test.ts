import { Relayer, StarshipConfig } from '@starship-ci/types';

import { applyDefaults, deepMerge, DefaultsManager } from '../src/defaults';

describe('DefaultsManager', () => {
  let defaultsManager: DefaultsManager;

  beforeEach(() => {
    defaultsManager = new DefaultsManager();
  });

  describe('processRelayer', () => {
    it('should merge partial overrides with defaults correctly', () => {
      const relayerConfig: Relayer = {
        type: 'hermes',
        name: 'test-hermes',
        chains: ['chain1', 'chain2'],
        replicas: 1,
        config: {
          rest: {
            port: 3001 // Only override port, should keep other defaults
          },
          telemetry: {
            enabled: false // Only override enabled, should keep other defaults
          }
        }
      };

      const processedRelayer = defaultsManager.processRelayer(relayerConfig);

      // Should have merged partial overrides with defaults
      expect(processedRelayer.config?.rest?.port).toBe(3001);
      expect(processedRelayer.config?.rest?.host).toBe('0.0.0.0');
      expect(processedRelayer.config?.rest?.enabled).toBe(true);
      expect(processedRelayer.config?.telemetry?.enabled).toBe(false);
      expect(processedRelayer.config?.telemetry?.host).toBe('0.0.0.0');
      expect(processedRelayer.config?.telemetry?.port).toBe(3001);
    });

    it('should handle complete overrides', () => {
      const relayerConfig: Relayer = {
        type: 'hermes',
        name: 'test-hermes',
        chains: ['chain1'],
        replicas: 1,
        config: {
          rest: {
            enabled: false,
            host: '127.0.0.1',
            port: 8080
          },
          telemetry: {
            enabled: true,
            host: '127.0.0.1',
            port: 9090
          }
        }
      };

      const processedRelayer = defaultsManager.processRelayer(relayerConfig);

      // Should use complete overrides
      expect(processedRelayer.config?.rest?.enabled).toBe(false);
      expect(processedRelayer.config?.rest?.host).toBe('127.0.0.1');
      expect(processedRelayer.config?.rest?.port).toBe(8080);
      expect(processedRelayer.config?.telemetry?.enabled).toBe(true);
      expect(processedRelayer.config?.telemetry?.host).toBe('127.0.0.1');
      expect(processedRelayer.config?.telemetry?.port).toBe(9090);
    });

    it('should handle relayers with no config', () => {
      const relayerConfig: Relayer = {
        type: 'hermes',
        name: 'test-hermes',
        chains: ['chain1'],
        replicas: 1
      };

      const processedRelayer = defaultsManager.processRelayer(relayerConfig);

      // Should use all defaults
      expect(processedRelayer.config?.rest?.enabled).toBe(true);
      expect(processedRelayer.config?.rest?.host).toBe('0.0.0.0');
      expect(processedRelayer.config?.rest?.port).toBe(3000);
      expect(processedRelayer.config?.telemetry?.enabled).toBe(true);
      expect(processedRelayer.config?.telemetry?.host).toBe('0.0.0.0');
      expect(processedRelayer.config?.telemetry?.port).toBe(3001);
    });

    it('should handle different relayer types', () => {
      const hermesRelayer: Relayer = {
        type: 'hermes' as const,
        name: 'test-hermes',
        chains: ['chain1'],
        replicas: 1
      };

      const goRelayer: Relayer = {
        type: 'go-relayer' as const,
        name: 'test-go',
        chains: ['chain1'],
        replicas: 1
      };

      const tsRelayer: Relayer = {
        type: 'ts-relayer' as const,
        name: 'test-ts',
        chains: ['chain1'],
        replicas: 1
      };

      const neutronRelayer: Relayer = {
        type: 'neutron-query-relayer' as const,
        name: 'test-neutron',
        chains: ['chain1'],
        replicas: 1
      };

      // All should be processed without errors
      expect(() => defaultsManager.processRelayer(hermesRelayer)).not.toThrow();
      expect(() => defaultsManager.processRelayer(goRelayer)).not.toThrow();
      expect(() => defaultsManager.processRelayer(tsRelayer)).not.toThrow();
      expect(() =>
        defaultsManager.processRelayer(neutronRelayer)
      ).not.toThrow();
    });
  });

  describe('applyDefaults', () => {
    it('should apply defaults to a full config', () => {
      const config: StarshipConfig = {
        name: 'test',
        chains: [],
        relayers: [],
      };

      const processedConfig = applyDefaults(config);

      expect(processedConfig.relayers).toHaveLength(0);
      expect(processedConfig.chains).toHaveLength(0);
      expect(processedConfig.exposer?.image).toBe('ghcr.io/hyperweb-io/starship/exposer:20250205-544757d');
      expect(processedConfig.faucet?.image).toBe('ghcr.io/hyperweb-io/starship/faucet:20250205-544757d');
      expect(processedConfig.monitoring?.enabled).toBe(false);
      expect(processedConfig.ingress?.enabled).toBe(false);
      expect(processedConfig.ingress?.type).toBe('nginx');
      expect(processedConfig.images?.imagePullPolicy).toBe('IfNotPresent');
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

      expect(processedConfig.relayers).toBeUndefined();
    });
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
