import { Chain, StarshipConfig } from '@starship-ci/types';

import { ScriptManager } from '../../../scripts';
import { IGenerator, Manifest } from '../../../types';
import { CosmosGenesisStatefulSetGenerator } from './genesis';
import { CosmosValidatorStatefulSetGenerator } from './validator';

/**
 * StatefulSet generator for Cosmos chains
 * Handles genesis and validator StatefulSets
 */
export class CosmosStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;
  private statefulSetGenerators: Array<IGenerator>;

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.config = config;
    this.chain = chain;
    this.scriptManager = scriptManager;
    
    this.statefulSetGenerators = [
      new CosmosGenesisStatefulSetGenerator(this.chain, this.config, this.scriptManager)
    ];
    
    // Add validator StatefulSet if numValidators > 1
    if (this.chain.numValidators && this.chain.numValidators > 1) {
      this.statefulSetGenerators.push(
        new CosmosValidatorStatefulSetGenerator(this.chain, this.config, this.scriptManager)
      );
    }
  }

  generate(): Array<Manifest> {
    return this.statefulSetGenerators.flatMap((generator) => generator.generate());
  }
} 