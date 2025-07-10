import { ScriptManager } from '../../../scripts';
import { GeneratorConfig, IGenerator, Manifest } from '../../../types';
import { CometMockGenerator } from './cometmock';
import {
  CosmosConfigMapGenerator,
  GlobalConfigMapGenerator
} from './configmap';
import { CosmosServiceGenerator } from './service';
import { CosmosStatefulSetGenerator } from './statefulset';

/**
 * Main Cosmos builder
 * Orchestrates ConfigMap, Service, and StatefulSet generation for all Cosmos chains
 */
export class CosmosBuilder implements IGenerator {
  private config: GeneratorConfig;
  private scriptManager: ScriptManager;
  private generators: IGenerator[];

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.scriptManager = new ScriptManager(undefined, config.configDir);
    this.generators = [];

    // Filter cosmos chains (exclude ethereum chains)
    const cosmosChains =
      this.config.chains?.filter(
        (chain) => chain.name !== 'ethereum' && typeof chain.id === 'string'
      ) || [];

    if (cosmosChains.length === 0) {
      return; // No cosmos chains to process
    }

    // Global ConfigMaps (keys, global scripts)
    this.generators.push(new GlobalConfigMapGenerator(this.config));

    // Per-chain generators
    cosmosChains.forEach((chain) => {
      // Services
      this.generators.push(new CosmosServiceGenerator(chain, this.config));

      // StatefulSets
      this.generators.push(
        new CosmosStatefulSetGenerator(chain, this.config, this.scriptManager)
      );

      // ConfigMaps
      this.generators.push(
        new CosmosConfigMapGenerator(chain, this.config, this.scriptManager)
      );

      // CometMock (if enabled)
      this.generators.push(new CometMockGenerator(chain, this.config));
    });
  }

  generate(): Manifest[] {
    return this.generators.flatMap((generator) => generator.generate());
  }
}
