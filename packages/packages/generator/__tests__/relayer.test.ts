import { ConfigMap, Service, StatefulSet } from 'kubernetesjs';

import { RelayerBuilder } from '../src/builders/relayers';
import {
  neutronRelayerConfig,
  singleChainConfig,
  twoChainWithGoRelayerConfig,
  twoChainWithHermesConfig
} from './test-utils/config';

describe('RelayerBuilder', () => {
  describe('Basic Relayer Generation', () => {
    it('should generate no manifests when no relayers are configured', () => {
      const config = { ...singleChainConfig };
      delete config.relayers;

      const builder = new RelayerBuilder(config);
      const manifests = builder.generate();

      expect(manifests).toEqual([]);

      // Snapshot test
      expect(manifests).toMatchSnapshot('no-relayers-empty-manifests');
    });

    it('should generate manifests for a hermes relayer', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      expect(manifests).toHaveLength(3); // ConfigMap, Service, StatefulSet

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const service = manifests.find((m) => m.kind === 'Service') as Service;
      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;

      expect(configMap).toBeDefined();
      expect(configMap.metadata.name).toBe('hermes-osmos-cosmos');
      expect(configMap.data['config.toml']).toContain('log_level = "info"');

      expect(service).toBeDefined();
      expect(service.metadata.name).toBe('hermes-osmos-cosmos');
      expect(service.spec.ports).toHaveLength(2); // rest and exposer

      expect(statefulSet).toBeDefined();
      expect(statefulSet.metadata.name).toBe('hermes-osmos-cosmos');
      expect(statefulSet.spec.replicas).toBe(1);

      // Snapshot test
      expect(manifests).toMatchSnapshot('hermes-relayer-manifests');
    });

    it('should generate manifests for a go-relayer', () => {
      const builder = new RelayerBuilder(twoChainWithGoRelayerConfig);
      const manifests = builder.generate();

      expect(manifests).toHaveLength(2); // ConfigMap, StatefulSet (no service)

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;

      expect(configMap).toBeDefined();
      expect(configMap.metadata.name).toBe('go-relayer-osmos-cosmos');
      expect(configMap.data['path.json']).toContain('osmosis-1');

      expect(statefulSet).toBeDefined();
      expect(statefulSet.metadata.name).toBe('go-relayer-osmos-cosmos');

      // Snapshot test
      expect(manifests).toMatchSnapshot('go-relayer-manifests');
    });

    it('should generate manifests for a ts-relayer', () => {
      // Create a simple ts-relayer config based on the go-relayer config
      const tsRelayerConfig = {
        ...twoChainWithGoRelayerConfig,
        relayers: [
          {
            name: 'ts-rly',
            type: 'ts-relayer' as const,
            replicas: 1,
            chains: ['osmosis-1', 'cosmoshub-4']
          }
        ]
      };

      const builder = new RelayerBuilder(tsRelayerConfig);
      const manifests = builder.generate();

      expect(manifests).toHaveLength(2); // ConfigMap, StatefulSet (no service)

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;

      expect(configMap).toBeDefined();
      expect(configMap.metadata.name).toBe('ts-relayer-ts-rly');
      expect(configMap.data['app.yaml']).toBeDefined();
      expect(configMap.data['registry.yaml']).toContain('osmosis-1');

      expect(statefulSet).toBeDefined();
      expect(statefulSet.metadata.name).toBe('ts-relayer-ts-rly');

      // Snapshot test
      expect(manifests).toMatchSnapshot('ts-relayer-manifests');
    });

    it('should generate manifests for a neutron-query-relayer', () => {
      const builder = new RelayerBuilder(neutronRelayerConfig);
      const manifests = builder.generate();

      expect(manifests).toHaveLength(3); // ConfigMap, Service, StatefulSet

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const service = manifests.find((m) => m.kind === 'Service') as Service;
      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;

      expect(configMap).toBeDefined();
      expect(configMap.metadata.name).toBe(
        'neutron-query-relayer-neutron-query'
      );

      expect(service).toBeDefined();
      expect(service.metadata.name).toBe('neutron-query-relayer-neutron-query');

      expect(statefulSet).toBeDefined();
      expect(statefulSet.metadata.name).toBe(
        'neutron-query-relayer-neutron-query'
      );

      // Snapshot test
      expect(manifests).toMatchSnapshot('neutron-query-relayer-manifests');
    });
  });

  describe('Advanced Relayer Configurations', () => {
    it('should handle multiple relayers', () => {
      // Create a config with multiple relayers
      const multiRelayerConfig = {
        ...twoChainWithHermesConfig,
        relayers: [
          ...twoChainWithHermesConfig.relayers!,
          {
            name: 'go-rly',
            type: 'go-relayer' as const,
            replicas: 1,
            chains: ['osmosis-1', 'cosmoshub-4']
          }
        ]
      };

      const builder = new RelayerBuilder(multiRelayerConfig);
      const manifests = builder.generate();

      expect(manifests).toHaveLength(5); // hermes (3 manifests) + go-relayer (2 manifests)

      const hermesManifests = manifests.filter((m) =>
        m.metadata.name.includes('osmos-cosmos')
      );
      const goRelayerManifests = manifests.filter((m) =>
        m.metadata.name.includes('go-rly')
      );

      expect(hermesManifests).toHaveLength(3);
      expect(goRelayerManifests).toHaveLength(2);

      // Verify resource types
      const configMaps = manifests.filter((m) => m.kind === 'ConfigMap');
      const services = manifests.filter((m) => m.kind === 'Service');
      const statefulSets = manifests.filter((m) => m.kind === 'StatefulSet');

      expect(configMaps).toHaveLength(2); // One per relayer
      expect(services).toHaveLength(1); // Only hermes has service
      expect(statefulSets).toHaveLength(2); // One per relayer

      // Snapshot test
      expect(manifests).toMatchSnapshot('multiple-relayers-manifests');
    });

    it('should use custom image when provided', () => {
      // Create a config with custom image
      const customImageConfig = {
        ...twoChainWithHermesConfig,
        relayers: [
          {
            ...twoChainWithHermesConfig.relayers![0],
            name: 'custom-hermes',
            image: 'custom/hermes:latest'
          }
        ]
      };

      const builder = new RelayerBuilder(customImageConfig);
      const manifests = builder.generate();

      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;
      const initContainers = statefulSet.spec.template.spec.initContainers;
      const containers = statefulSet.spec.template.spec.containers;

      const relayerInitContainer = initContainers.find(
        (c: any) => c.name === 'init-relayer'
      );
      const relayerContainer = containers.find(
        (c: any) => c.name === 'relayer'
      );

      expect(relayerInitContainer.image).toBe('custom/hermes:latest');
      expect(relayerContainer.image).toBe('custom/hermes:latest');

      // Snapshot test
      expect(manifests).toMatchSnapshot('custom-image-relayer-manifests');
    });

    it('should handle different relayer configurations', () => {
      // Test all relayer types together
      const allRelayersConfig = {
        ...twoChainWithHermesConfig,
        chains: [
          ...twoChainWithHermesConfig.chains,
          {
            id: 'neutron-1',
            name: 'neutron' as const,
            numValidators: 1,
            prefix: 'neutron',
            denom: 'untrn',
            home: '/root/.neutrond'
          }
        ],
        relayers: [
          {
            name: 'hermes-relay',
            type: 'hermes' as const,
            replicas: 1,
            chains: ['osmosis-1', 'cosmoshub-4'],
            config: {
              global: { log_level: 'debug' },
              rest: { enabled: true, port: 3001 }
            }
          },
          {
            name: 'go-relay',
            type: 'go-relayer' as const,
            replicas: 2,
            chains: ['osmosis-1', 'cosmoshub-4']
          },
          {
            name: 'ts-relay',
            type: 'ts-relayer' as const,
            replicas: 1,
            chains: ['osmosis-1', 'neutron-1']
          },
          {
            name: 'neutron-query-relay',
            type: 'neutron-query-relayer' as const,
            replicas: 1,
            chains: ['neutron-1', 'osmosis-1'],
            config: {
              RELAYER_NEUTRON_CHAIN_TIMEOUT: '2000s'
            }
          }
        ]
      };

      const builder = new RelayerBuilder(allRelayersConfig);
      const manifests = builder.generate();

      // Should have 4 ConfigMaps, 2 Services (hermes + neutron-query), 4 StatefulSets
      const configMaps = manifests.filter((m) => m.kind === 'ConfigMap');
      const services = manifests.filter((m) => m.kind === 'Service');
      const statefulSets = manifests.filter((m) => m.kind === 'StatefulSet');

      expect(configMaps).toHaveLength(4);
      expect(services).toHaveLength(2); // Only hermes and neutron-query expose services
      expect(statefulSets).toHaveLength(4);

      // Verify each relayer type exists
      const hermesManifests = manifests.filter((m) =>
        m.metadata.name.includes('hermes-relay')
      );
      const goRelayerManifests = manifests.filter((m) =>
        m.metadata.name.includes('go-relay')
      );
      const tsRelayerManifests = manifests.filter((m) =>
        m.metadata.name.includes('ts-relay')
      );
      const neutronManifests = manifests.filter((m) =>
        m.metadata.name.includes('neutron-query-relay')
      );

      expect(hermesManifests).toHaveLength(3);
      expect(goRelayerManifests).toHaveLength(2);
      expect(tsRelayerManifests).toHaveLength(2);
      expect(neutronManifests).toHaveLength(3);

      // Snapshot test
      expect(manifests).toMatchSnapshot('all-relayer-types-manifests');
    });
  });

  describe('Resource Validation', () => {
    it('should generate correct labels and metadata', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const service = manifests.find((m) => m.kind === 'Service') as Service;
      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;

      // Check ConfigMap labels
      expect(configMap.metadata.labels).toBeDefined();
      expect(configMap.metadata.labels['app.kubernetes.io/component']).toBe(
        'relayer'
      );
      expect(configMap.metadata.labels['app.kubernetes.io/part-of']).toBe(
        'starship'
      );
      expect(configMap.metadata.labels['app.kubernetes.io/role']).toBe(
        'hermes'
      );

      // Check Service labels
      expect(service.metadata.labels).toBeDefined();
      expect(service.metadata.labels['app.kubernetes.io/component']).toBe(
        'relayer'
      );

      // Check StatefulSet labels and selectors
      expect(statefulSet.metadata.labels).toBeDefined();
      expect(statefulSet.spec.selector.matchLabels).toBeDefined();
      expect(
        statefulSet.spec.selector.matchLabels['app.kubernetes.io/instance']
      ).toBe('relayer');
      expect(
        statefulSet.spec.selector.matchLabels['app.kubernetes.io/type']
      ).toBe('hermes');

      // Snapshot test for labels
      expect({
        configMapLabels: configMap.metadata.labels,
        serviceLabels: service.metadata.labels,
        statefulSetLabels: statefulSet.metadata.labels,
        statefulSetSelector: statefulSet.spec.selector.matchLabels
      }).toMatchSnapshot('relayer-labels-and-selectors');
    });

    it('should generate correct port configurations', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      const service = manifests.find((m) => m.kind === 'Service') as Service;
      const ports = service.spec.ports;

      expect(ports).toHaveLength(2);

      const restPort = ports.find((p: any) => p.name === 'rest');
      const exposerPort = ports.find((p: any) => p.name === 'exposer');

      expect(restPort).toBeDefined();
      expect(restPort.port).toBe(3000);
      expect(restPort.protocol).toBe('TCP');

      expect(exposerPort).toBeDefined();
      expect(exposerPort.protocol).toBe('TCP');

      // Snapshot test for port configuration
      expect(ports).toMatchSnapshot('hermes-service-ports');
    });

    it('should generate correct container configurations', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;
      const containers = statefulSet.spec.template.spec.containers;
      const initContainers = statefulSet.spec.template.spec.initContainers;

      // Should have relayer and exposer containers for hermes
      expect(containers).toHaveLength(2);
      const relayerContainer = containers.find(
        (c: any) => c.name === 'relayer'
      );
      const exposerContainer = containers.find(
        (c: any) => c.name === 'exposer'
      );

      expect(relayerContainer).toBeDefined();
      expect(exposerContainer).toBeDefined();

      // Should have init containers
      expect(initContainers.length).toBeGreaterThan(0);

      const initExposerContainer = initContainers.find(
        (c: any) => c.name === 'init-exposer'
      );
      const initRelayerContainer = initContainers.find(
        (c: any) => c.name === 'init-relayer'
      );

      expect(initExposerContainer).toBeDefined();
      expect(initRelayerContainer).toBeDefined();

      // Snapshot test for container configuration
      expect({
        containerCount: containers.length,
        initContainerCount: initContainers.length,
        relayerContainerImage: relayerContainer.image,
        hasExposerContainer: !!exposerContainer
      }).toMatchSnapshot('hermes-container-configuration');
    });

    it('should generate correct volume configurations', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      const statefulSet = manifests.find(
        (m) => m.kind === 'StatefulSet'
      ) as StatefulSet;
      const volumes = statefulSet.spec.template.spec.volumes;

      expect(volumes.length).toBeGreaterThan(0);

      // Check for required volumes
      const relayerVolume = volumes.find((v: any) => v.name === 'relayer');
      const configVolume = volumes.find(
        (v: any) => v.name === 'relayer-config'
      );
      const keysVolume = volumes.find((v: any) => v.name === 'keys');
      const scriptsVolume = volumes.find((v: any) => v.name === 'scripts');
      const exposerVolume = volumes.find((v: any) => v.name === 'exposer');

      expect(relayerVolume).toBeDefined();
      expect(configVolume).toBeDefined();
      expect(keysVolume).toBeDefined();
      expect(scriptsVolume).toBeDefined();
      expect(exposerVolume).toBeDefined(); // hermes specific

      // Snapshot test for volume configuration
      expect(volumes).toMatchSnapshot('hermes-volume-configuration');
    });
  });

  describe('Configuration Content Validation', () => {
    it('should generate correct hermes configuration', () => {
      const builder = new RelayerBuilder(twoChainWithHermesConfig);
      const manifests = builder.generate();

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const configToml = configMap.data['config.toml'];

      // Verify configuration structure
      expect(configToml).toContain('[global]');
      expect(configToml).toContain('[mode]');
      expect(configToml).toContain('[rest]');
      expect(configToml).toContain('[telemetry]');
      expect(configToml).toContain('[[chains]]');

      // Verify chain configurations
      expect(configToml).toContain('id = "osmosis-1"');
      expect(configToml).toContain('id = "cosmoshub-4"');
      expect(configToml).toContain('key_name = "osmosis-1"');
      expect(configToml).toContain('key_name = "cosmoshub-4"');

      // Verify RPC endpoints
      expect(configToml).toContain(
        'rpc_addr = "http://osmosis-1-genesis.$NAMESPACE.svc.cluster.local:26657"'
      );
      expect(configToml).toContain(
        'rpc_addr = "http://cosmoshub-4-genesis.$NAMESPACE.svc.cluster.local:26657"'
      );

      // Snapshot test for configuration content
      expect(configToml).toMatchSnapshot('hermes-config-toml-content');
    });

    it('should generate correct go-relayer configuration', () => {
      const builder = new RelayerBuilder(twoChainWithGoRelayerConfig);
      const manifests = builder.generate();

      const configMap = manifests.find(
        (m) => m.kind === 'ConfigMap'
      ) as ConfigMap;
      const pathJson = JSON.parse(configMap.data['path.json'] as string);

      // Verify path configuration
      expect(pathJson.paths).toBeDefined();
      expect(pathJson.paths.path).toBeDefined();
      expect(pathJson.paths.path.src['chain-id']).toBe('osmosis-1');
      expect(pathJson.paths.path.dst['chain-id']).toBe('cosmoshub-4');
      expect(pathJson.paths.path['src-channel-filter']).toBeDefined();

      // Verify chain configurations exist
      expect(configMap.data['osmosis-1.json'] as string).toBeDefined();
      expect(configMap.data['cosmoshub-4.json'] as string).toBeDefined();

      const osmosisConfig = JSON.parse(
        configMap.data['osmosis-1.json'] as string
      );
      expect(osmosisConfig.type).toBe('cosmos');
      expect(osmosisConfig.value['chain-id']).toBe('osmosis-1');
      expect(osmosisConfig.value['rpc-addr']).toContain('osmosis-1-genesis');

      // Snapshot test for configuration content
      expect({
        pathJson,
        osmosisConfigExists: !!configMap.data['osmosis-1.json'],
        cosmoshubConfigExists: !!configMap.data['cosmoshub-4.json']
      }).toMatchSnapshot('go-relayer-config-content');
    });
  });
});
