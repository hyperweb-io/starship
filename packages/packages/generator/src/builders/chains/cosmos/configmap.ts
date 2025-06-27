import { Chain, StarshipConfig } from '@starship-ci/types';
import * as fs from 'fs';
import { ConfigMap } from 'kubernetesjs';
import * as path from 'path';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { ScriptManager } from '../../../scripts';
import { IGenerator, Manifest } from '../../../types';

/**
 * Keys ConfigMap generator
 * Handles the global keys.json configuration
 */
export class KeysConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private projectRoot: string;

  constructor(config: StarshipConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  generate(): Manifest[] {
    const keysFilePath = path.join(this.projectRoot, 'configs', 'keys.json');

    if (!fs.existsSync(keysFilePath)) {
      console.warn(
        `Warning: 'configs/keys.json' not found. Skipping Keys ConfigMap.`
      );
      return [];
    }

    try {
      const keysFileContent = fs.readFileSync(keysFilePath, 'utf-8');
      return [
        {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: 'keys',
            labels: {
              ...helpers.getCommonLabels(this.config),
              'app.kubernetes.io/component': 'configmap',
              'app.kubernetes.io/part-of': 'global'
            }
          },
          data: {
            'keys.json': keysFileContent
          }
        }
      ];
    } catch (error) {
      console.warn(
        `Warning: Could not read 'configs/keys.json'. Error: ${(error as Error).message}. Skipping.`
      );
      return [];
    }
  }
}

/**
 * Global Scripts ConfigMap generator
 * Handles the shared scripts from scripts/default directory
 */
export class GlobalScriptsConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private projectRoot: string;

  constructor(config: StarshipConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  generate(): Manifest[] {
    const scriptsDir = path.join(this.projectRoot, 'scripts', 'default');
    if (!fs.existsSync(scriptsDir)) {
      return [];
    }

    const data: { [key: string]: string } = {};
    try {
      const scriptFiles = fs
        .readdirSync(scriptsDir)
        .filter((file) => file.endsWith('.sh'));

      if (scriptFiles.length === 0) {
        return [];
      }

      scriptFiles.forEach((fileName) => {
        const filePath = path.join(scriptsDir, fileName);
        data[fileName] = fs.readFileSync(filePath, 'utf-8');
      });
    } catch (error) {
      console.warn(
        `Warning: Could not read global scripts directory. Error: ${(error as Error).message}. Skipping.`
      );
      return [];
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'setup-scripts',
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'configmap',
            'app.kubernetes.io/part-of': 'global'
          }
        },
        data
      }
    ];
  }
}

/**
 * Chain-specific setup scripts ConfigMap generator
 */
export class SetupScriptsConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.config = config;
    this.chain = chain;
    this.scriptManager = scriptManager;
  }

  generate(): Manifest[] {
    const scripts = this.chain.scripts;

    if (!scripts || Object.keys(scripts).length === 0) {
      return [];
    }

    const data: { [key: string]: string } = {};

    Object.entries(scripts).forEach(([key, script]) => {
      if (!script) return;

      const scriptName = script.name || `${key}.sh`;
      try {
        data[scriptName] = this.scriptManager.getScriptContent(script);
      } catch (error) {
        console.warn(
          `Warning: Could not load script ${scriptName}. Error: ${(error as Error).message}. Skipping.`
        );
      }
    });

    if (Object.keys(data).length === 0) {
      return [];
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `setup-scripts-${helpers.getHostname(this.chain)}`,
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'chain',
            'app.kubernetes.io/name': this.chain.name,
            'app.kubernetes.io/part-of': helpers.getChainId(this.chain),
            'app.kubernetes.io/role': 'setup-scripts',
            'starship.io/chain-name': this.chain.name,
            'starship.io/chain-id': helpers.getChainId(this.chain)
          }
        },
        data
      }
    ];
  }
}

/**
 * Genesis patch ConfigMap generator
 */
export class GenesisPatchConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
  }

  generate(): Manifest[] {
    if (!this.chain.genesis) {
      return [];
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `patch-${helpers.getHostname(this.chain)}`,
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'chain',
            'app.kubernetes.io/name': this.chain.name,
            'app.kubernetes.io/part-of': helpers.getChainId(this.chain),
            'app.kubernetes.io/role': 'genesis-patch',
            'starship.io/chain-name': this.chain.name,
            'starship.io/chain-id': helpers.getChainId(this.chain)
          }
        },
        data: {
          'genesis.json': JSON.stringify(this.chain.genesis, null, 2)
        }
      }
    ];
  }
}

/**
 * ICS Consumer Proposal ConfigMap generator
 */
export class IcsConsumerProposalConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private defaultsManager: DefaultsManager;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
    this.defaultsManager = new DefaultsManager();
  }

  generate(): Manifest[] {
    if (!this.chain.ics?.enabled || !this.chain.ics.provider) {
      return [];
    }

    const providerChain = this.config.chains.find(
      (c) => c.id === this.chain.ics.provider
    );
    
    if (!providerChain) {
      console.warn(
        `Warning: ICS Provider chain '${this.chain.ics.provider}' not found. Skipping ICS proposal for '${this.chain.id}'.`
      );
      return [];
    }

    const processedProviderChain = this.defaultsManager.processChain(providerChain);

    const proposal = {
      title: `Add ${this.chain.name} consumer chain`,
      summary: `Add ${this.chain.name} consumer chain with id ${helpers.getChainId(this.chain)}`,
      chain_id: helpers.getChainId(this.chain),
      initial_height: {
        revision_height: 1,
        revision_number: 1
      },
      genesis_hash:
        'd86d756e10118e66e6805e9cc476949da2e750098fcc7634fd0cc77f57a0b2b0',
      binary_hash:
        '376cdbd3a222a3d5c730c9637454cd4dd925e2f9e2e0d0f3702fc922928583f1',
      spawn_time: '2023-02-28T20:40:00.000000Z',
      unbonding_period: 294000000000,
      ccv_timeout_period: 259920000000,
      transfer_timeout_period: 18000000000,
      consumer_redistribution_fraction: '0.75',
      blocks_per_distribution_transmission: 10,
      historical_entries: 100,
      distribution_transmission_channel: '',
      top_N: 95,
      validators_power_cap: 0,
      validator_set_cap: 0,
      allowlist: [] as string[],
      denylist: [] as string[],
      deposit: `10000${processedProviderChain.denom}`
    };

    return [
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `consumer-proposal-${helpers.getHostname(this.chain)}`,
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'chain',
            'app.kubernetes.io/name': this.chain.name,
            'app.kubernetes.io/part-of': helpers.getChainId(this.chain),
            'app.kubernetes.io/role': 'ics-proposal',
            'starship.io/chain-name': this.chain.name,
            'starship.io/chain-id': helpers.getChainId(this.chain)
          }
        },
        data: {
          'proposal.json': JSON.stringify(proposal, null, 2)
        }
      }
    ];
  }
}

/**
 * Main ConfigMap generator orchestrator for Cosmos chains
 */
export class CosmosConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;
  private generators: IGenerator[];

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.config = config;
    this.chain = chain;
    this.scriptManager = scriptManager;
    
    this.generators = [
      new SetupScriptsConfigMapGenerator(this.chain, this.config, this.scriptManager),
      new GenesisPatchConfigMapGenerator(this.chain, this.config),
      new IcsConsumerProposalConfigMapGenerator(this.chain, this.config)
    ];
  }

  generate(): Manifest[] {
    return this.generators.flatMap((generator) => generator.generate());
  }
}

/**
 * Global ConfigMap generator orchestrator
 * Handles ConfigMaps that are shared across all chains
 */
export class GlobalConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;
  private generators: IGenerator[];

  constructor(config: StarshipConfig, projectRoot?: string) {
    this.config = config;
    
    this.generators = [
      new KeysConfigMapGenerator(this.config, projectRoot),
      new GlobalScriptsConfigMapGenerator(this.config, projectRoot)
    ];
  }

  generate(): Manifest[] {
    return this.generators.flatMap((generator) => generator.generate());
  }
}
