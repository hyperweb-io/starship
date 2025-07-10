import { Chain, StarshipConfig } from '@starship-ci/types';
import { Service } from 'kubernetesjs';

import * as helpers from '../../../helpers';
import { IGenerator, Manifest } from '../../../types';

class CosmosGenesisServiceGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private ports: string[];

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
    this.ports = ['p2p', 'address', 'grpc', 'grpc-web', 'rest', 'rpc', 'metrics', 'exposer', 'faucet'];
  }

  labels(): Record<string, string> {
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-genesis`,
      'app.kubernetes.io/type': `${helpers.getChainId(this.chain)}-service`,
      'app.kubernetes.io/role': 'genesis',
      'starship.io/chain-name': this.chain.name,
      'starship.io/chain-id': helpers.getChainId(this.chain)
    };
  }

  generate(): Array<Service> {
    const portMap = helpers.getPortMap();
    const ports = Object.entries(portMap).map(([name, port]) => ({
      name,
      port,
      protocol: 'TCP' as const,
      targetPort: String(port)
    }));

    // Add metrics port if enabled
    if (this.chain.metrics) {
      ports.push({
        name: 'metrics',
        port: 26660,
        protocol: 'TCP' as const,
        targetPort: '26660'
      });
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${helpers.getHostname(this.chain)}-genesis`,
          labels: this.labels()
        },
        spec: {
          clusterIP: 'None',
          ports,
          selector: {
            'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-genesis`
          }
        }
      }
    ];
  }
}

class CosmosValidatorServiceGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
  }

  labels(): Record<string, string> {
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-validator`,
      'app.kubernetes.io/role': 'validator',
      'app.kubernetes.io/type': `${helpers.getChainId(this.chain)}-service`,
      'starship.io/chain-name': this.chain.name,
      'starship.io/chain-id': helpers.getChainId(this.chain)
    };
  }

  generate(): Array<Service> {
    const portMap = helpers.getPortMap();
    const ports = Object.entries(portMap).map(([name, port]) => ({
      name,
      port,
      protocol: 'TCP' as const,
      targetPort: String(port)
    }));

    if (this.chain.metrics) {
      ports.push({
        name: 'metrics',
        port: 26660,
        protocol: 'TCP' as const,
        targetPort: '26660'
      });
    }

    return [
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${helpers.getHostname(this.chain)}-validator`,
          labels: this.labels()
        },
        spec: {
          clusterIP: 'None',
          ports,
          selector: {
            'app.kubernetes.io/name': `${helpers.getChainId(this.chain)}-validator`
          }
        }
      }
    ];
  }
}

/**
 * Service generator for Cosmos chains
 * Handles genesis and validator services
 */
export class CosmosServiceGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private serviceGenerators: Array<IGenerator>;

  constructor(chain: Chain, config: StarshipConfig) {
    this.config = config;
    this.chain = chain;
    this.serviceGenerators = [
      new CosmosGenesisServiceGenerator(this.chain, this.config)
    ];
    // Add validator service if numValidators > 1
    if (this.chain.numValidators && this.chain.numValidators > 1) {
      this.serviceGenerators.push(
        new CosmosValidatorServiceGenerator(this.chain, this.config)
      );
    }
  }

  generate(): Array<Manifest> {
    return this.serviceGenerators.flatMap((generator) => generator.generate());
  }
}
