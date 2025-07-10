import { StarshipConfig, Chain } from '@starship-ci/types';
import { ConfigMap, Deployment, Service } from 'kubernetesjs';

import * as helpers from '../helpers';
import { IGenerator, Manifest } from '../types';

/**
 * ConfigMap generator for Registry service
 * Handles chain configurations and asset lists
 */
export class RegistryConfigMapGenerator implements IGenerator {
  private config: StarshipConfig;

  constructor(config: StarshipConfig) {
    this.config = config;
  }

  getChainAssetList(chain: Chain): Record<string, any> {
    const chainName = chain.name === 'custom' ? chain.id : chain.name;
    
    let assets;
    if (chain.assets && chain.assets.length > 0) {
      assets = chain.assets;
    } else {
      assets = [
        {
          description: `The denom for token ${chain.denom}`,
          base: chain.denom,
          name: chain.denom,
          display: chain.denom,
          symbol: chain.denom.toUpperCase(),
          denom_units: [
            {
              denom: chain.denom,
              exponent: 0
            },
            {
              denom: chain.denom,
              exponent: 6
            }
          ],
          coingecko_id: chain.name
        }
      ];
    }

    return {
      "$schema": "../assetlist.schema.json",
      chain_name: chainName,
      assets: assets
    };
  }

  getChainConfig(chain: Chain): Record<string, any> {
    const chainName = chain.name === 'custom' ? chain.id : chain.name;
    
    const config: Record<string, any> = {
      "$schema": "../chain.schema.json",
      chain_name: chainName,
      status: "live",
      network_type: "devnet",
      chain_id: chain.id,
      pretty_name: `${chain.prettyName} Devnet`,
      bech32_prefix: chain.prefix,
      daemon_name: chain.binary,
      node_home: chain.home,
      key_algos: ["secp256k1"],
      slip44: String(chain.coinType),
      fees: {
        fee_tokens: [
          {
            denom: chain.denom,
            fixed_min_gas_price: 0,
            low_gas_price: 0,
            average_gas_price: 0.025,
            high_gas_price: 0.04
          }
        ]
      },
      staking: {
        staking_tokens: [
          {
            denom: chain.denom
          }
        ],
        lock_duration: {
          time: "1209600s"
        }
      },
      codebase: {
        git_repo: chain.repo,
        compatible_versions: [],
        binaries: {},
        ics_enabled: [],
        versions: [],
        consensus: {
          type: "tendermint"
        }
      },
      peers: {
        seeds: [],
        persistent_peers: []
      }
    };

    // Add explorers section if explorer is enabled (equivalent to Helm's if condition)
    if (this.config.explorer?.enabled) {
      config.explorers = [
        {
          kind: this.config.explorer.type,
          url: `http://localhost:${this.config.explorer.ports?.rest}`
        }
      ];
    }

    return config;
  }

  generate(): Array<ConfigMap> {
    let configMaps: Array<ConfigMap> = [];

    this.config.chains.forEach((chain) => {
      const chainConfig = this.getChainConfig(chain);
      const assetList = this.getChainAssetList(chain);

      configMaps.push({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `registry-${helpers.getChainName(String(chain.id))}`,
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'registry',
            'app.kubernetes.io/part-of': 'starship',
            'app.kubernetes.io/name': `registry-${helpers.getChainName(String(chain.id))}`
          }
        },
        data: {
          "chain.json": JSON.stringify(chainConfig, null, 2),
          "assetlist.json": JSON.stringify(assetList, null, 2)
        }
      });
    });

    return configMaps;
  }
}

/**
 * Service generator for Registry service
 */
export class RegistryServiceGenerator implements IGenerator {
  private config: StarshipConfig;

  constructor(config: StarshipConfig) {
    this.config = config;
  }

  generate(): Array<Service> {
    return [
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: 'registry',
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'registry',
            'app.kubernetes.io/part-of': 'starship',
            'app.kubernetes.io/name': 'registry'
          }
        },
        spec: {
          clusterIP: 'None',
          selector: {
            'app.kubernetes.io/name': 'registry'
          },
          ports: [
            {
              name: 'http',
              port: 8080,
              targetPort: '8080'
            },
            {
              name: 'grpc',
              port: 9090,
              targetPort: '9090'
            }
          ]
        }
      }
    ];
  }
}

/**
 * Deployment generator for Registry service
 */
export class RegistryDeploymentGenerator implements IGenerator {
  private config: StarshipConfig;

  constructor(config: StarshipConfig) {
    this.config = config;
  }

  generate(): Array<Deployment> {
    const volumeMounts = this.config.chains.map((chain) => ({
      name: `registry-${helpers.getChainName(String(chain.id))}`,
      mountPath: `/chains/${chain.id}`
    }));

    const volumes = this.config.chains.map((chain) => ({
      name: `registry-${helpers.getChainName(String(chain.id))}`,
      configMap: {
        name: `registry-${helpers.getChainName(String(chain.id))}`
      }
    }));

    return [
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'registry',
          labels: {
            ...helpers.getCommonLabels(this.config),
            'app.kubernetes.io/component': 'registry',
            'app.kubernetes.io/part-of': 'starship',
            'app.kubernetes.io/name': 'registry'
          }
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              'app.kubernetes.io/name': 'registry'
            }
          },
          template: {
            metadata: {
              labels: {
                ...helpers.getCommonLabels(this.config),
                'app.kubernetes.io/component': 'registry',
                'app.kubernetes.io/part-of': 'starship',
                'app.kubernetes.io/name': 'registry'
              }
            },
            spec: {
              initContainers: [
                helpers.generateWaitInitContainer(
                  this.config.chains.map((chain) => String(chain.id)),
                  this.config.exposer.ports.rest,
                  this.config
                )
              ],
              containers: [
                {
                  name: 'registry',
                  image: this.config.registry?.image,
                  env: [
                    {
                      name: 'NAMESPACE',
                      valueFrom: {
                        fieldRef: {
                          fieldPath: 'metadata.namespace'
                        }
                      }
                    },
                    {
                      name: 'REGISTRY_CHAIN_CLIENT_IDS',
                      value: this.config.chains.map((chain) => String(chain.id)).join(',')
                    },
                    {
                      name: 'REGISTRY_CHAIN_CLIENT_NAMES',
                      value: this.config.chains.map((chain) => chain.name).join(',')
                    },
                    {
                      name: 'REGISTRY_CHAIN_CLIENT_RPCS',
                      value: helpers.getChainInternalRpcAddrs(
                        this.config.chains,
                      )
                    },
                    {
                      name: 'REGISTRY_CHAIN_API_RPCS',
                      value: helpers.getChainRpcAddrs(
                        this.config.chains,
                        this.config
                      )
                    },
                    {
                      name: 'REGISTRY_CHAIN_API_GRPCS',
                      value: helpers.getChainGrpcAddrs(
                        this.config.chains,
                        this.config
                      )
                    },
                    {
                      name: 'REGISTRY_CHAIN_API_RESTS',
                      value: helpers.getChainRestAddrs(
                        this.config.chains,
                        this.config
                      )
                    },
                    {
                      name: 'REGISTRY_CHAIN_CLIENT_EXPOSERS',
                      value: helpers.getChainExposerAddrs(this.config.chains)
                    },
                    {
                      name: 'REGISTRY_CHAIN_REGISTRY',
                      value: '/chains'
                    }

                  ],
                  volumeMounts,
                  resources: helpers.getResourceObject(this.config.registry?.resources),
                  readinessProbe: {
                    tcpSocket: {
                      port: '8080'
                    },
                    initialDelaySeconds: 5,
                    periodSeconds: 10
                  },
                  livenessProbe: {
                    tcpSocket: {
                      port: '8080'
                    },
                    initialDelaySeconds: 15,
                    periodSeconds: 20
                  }
                }
              ],
              volumes
            }
          }
        }
      }
    ];
  }
}

/**
 * Main Registry builder
 * Orchestrates ConfigMap, Service, and Deployment generation and file output
 */
export class RegistryBuilder implements IGenerator {
  private config: StarshipConfig;
  private generators: Array<IGenerator>;

  constructor(config: StarshipConfig) {
    this.config = config;
    this.generators = [];

    if (this.config.registry?.enabled === true) {
      this.generators = [
        new RegistryConfigMapGenerator(config),
        new RegistryServiceGenerator(config),
        new RegistryDeploymentGenerator(config)
      ];
    }
  }

  generate(): Array<Manifest> {
    return this.generators.flatMap((generator) => generator.generate());
  }
}
