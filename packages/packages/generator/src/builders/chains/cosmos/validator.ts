import { Chain, StarshipConfig } from '@starship-ci/types';
import { Container, StatefulSet } from 'kubernetesjs';

import { DefaultsManager } from '../../../defaults';
import * as helpers from '../../../helpers';
import { ScriptManager } from '../../../scripts';
import { IGenerator, Manifest } from '../../../types';
import { getGeneratorVersion } from '../../../version';

export class CosmosValidatorStatefulSetGenerator implements IGenerator {
  private config: StarshipConfig;
  private chain: Chain;
  private scriptManager: ScriptManager;
  private defaultsManager: DefaultsManager;

  constructor(chain: Chain, config: StarshipConfig, scriptManager: ScriptManager) {
    this.config = config;
    this.chain = chain;
    this.scriptManager = scriptManager;
    this.defaultsManager = new DefaultsManager();
  }

  labels(): Record<string, string> {
    const processedChain = this.defaultsManager.processChain(this.chain);
    return {
      ...helpers.getCommonLabels(this.config),
      'app.kubernetes.io/component': 'chain',
      'app.kubernetes.io/part-of': helpers.getChainId(processedChain),
      'app.kubernetes.io/id': helpers.getChainId(processedChain),
      'app.kubernetes.io/name': `${helpers.getHostname(processedChain)}-validator`,
      'app.kubernetes.io/type': `${helpers.getChainId(processedChain)}-statefulset`,
      'app.kubernetes.io/role': 'validator',
      'starship.io/chain-name': processedChain.name
    };
  }

  generate(): Array<StatefulSet> {
    const processedChain = this.defaultsManager.processChain(this.chain);
    
    return [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
          name: `${helpers.getHostname(processedChain)}-validator`,
          labels: this.labels()
        },
        spec: {
          serviceName: `${helpers.getHostname(processedChain)}-validator`,
          podManagementPolicy: 'Parallel',
          replicas: (processedChain.numValidators || 1) - 1,
          revisionHistoryLimit: 3,
          selector: {
            matchLabels: {
              'app.kubernetes.io/instance': this.config.name,
              'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-validator`
            }
          },
          template: {
            metadata: {
              annotations: {
                quality: 'release',
                role: 'api-gateway',
                sla: 'high',
                tier: 'gateway'
              },
              labels: {
                'app.kubernetes.io/instance': this.config.name,
                'app.kubernetes.io/type': helpers.getChainId(processedChain),
                'app.kubernetes.io/name': `${helpers.getChainId(processedChain)}-validator`,
                'app.kubernetes.io/version': getGeneratorVersion(),
                'app.kubernetes.io/role': 'validator'
              }
            },
            spec: {
              ...((processedChain as any).imagePullSecrets
                ? helpers.generateImagePullSecrets((processedChain as any).imagePullSecrets)
                : {}),
              initContainers: this.createInitContainers(processedChain),
              containers: this.createMainContainers(processedChain),
              volumes: helpers.generateChainVolumes(processedChain)
            }
          }
        }
      }
    ];
  }

  private createInitContainers(chain: Chain): Container[] {
    const initContainers: Container[] = [];

    // Build images init container if needed
    if (chain.build?.enabled || chain.upgrade?.enabled) {
      initContainers.push(this.createBuildImagesInitContainer(chain));
    }

    // Validator init container
    initContainers.push(this.createValidatorInitContainer(chain));

    // Validator config init container
    initContainers.push(this.createValidatorConfigContainer(chain));

    return initContainers;
  }

  private createMainContainers(chain: Chain): Container[] {
    return [this.createValidatorContainer(chain)];
  }

  private createBuildImagesInitContainer(chain: Chain): Container {
    const buildCommands = [
      '# Install cosmovisor',
      'go install github.com/cosmos/cosmos-sdk/cosmovisor/cmd/cosmovisor@v1.0.0',
      '',
      '# Build genesis'
    ];

    if (chain.upgrade?.enabled) {
      // Build genesis version
      buildCommands.push(
        `UPGRADE_NAME=genesis CODE_TAG=${chain.upgrade.genesis} bash -e /scripts/build-chain.sh`
      );

      // Build upgrade versions
      if (chain.upgrade.upgrades) {
        chain.upgrade.upgrades.forEach((upgrade: any) => {
          buildCommands.push(
            `UPGRADE_NAME=${upgrade.name} CODE_TAG=${upgrade.version} bash -e /scripts/build-chain.sh`
          );
        });
      }
    } else if (chain.build?.enabled) {
      buildCommands.push(
        `UPGRADE_NAME=genesis CODE_TAG=${chain.build.source} bash -e /scripts/build-chain.sh`
      );
    }

    return {
      name: 'init-build-images',
      image: 'ghcr.io/cosmology-tech/starship/builder:latest',
      imagePullPolicy: 'IfNotPresent',
      command: ['bash', '-c', buildCommands.join('\n')],
      env: [
        { name: 'CODE_REF', value: chain.repo },
        { name: 'UPGRADE_DIR', value: `${chain.home}/cosmovisor` },
        { name: 'GOBIN', value: '/go/bin' },
        { name: 'CHAIN_NAME', value: helpers.getChainId(chain) },
        ...helpers.getDefaultEnvVars(chain)
      ],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createValidatorInitContainer(chain: Chain): Container {
    return {
      name: 'init-validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' }
      ],
      command: ['bash', '-c', this.getValidatorInitScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createValidatorConfigContainer(chain: Chain): Container {
    return {
      name: 'init-validator-config',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        ...helpers.getTimeoutEnvVars(this.config.timeouts || {}),
        { name: 'KEYS_CONFIG', value: '/configs/keys.json' },
        { name: 'METRICS', value: String(chain.metrics || false) }
      ],
      command: ['bash', '-c', this.getValidatorConfigScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain)
    };
  }

  private createValidatorContainer(chain: Chain): Container {
    return {
      name: 'validator',
      image: chain.image,
      imagePullPolicy: this.config.images?.imagePullPolicy || 'IfNotPresent',
      env: [
        ...helpers.getDefaultEnvVars(chain),
        ...helpers.getChainEnvVars(chain),
        { name: 'SLOGFILE', value: 'slog.slog' },
        ...(chain.env || []).map((env: any) => ({
          name: env.name,
          value: String(env.value)
        }))
      ],
      command: ['bash', '-c', this.getValidatorStartScript(chain)],
      resources: helpers.getNodeResources(chain, this.config),
      volumeMounts: helpers.generateChainVolumeMounts(chain),
      lifecycle: {
        postStart: {
          exec: {
            command: ['bash', '-c', this.getValidatorPostStartScript(chain)]
          }
        }
      },
      ...(chain.cometmock?.enabled
        ? {}
        : {
            readinessProbe: chain.readinessProbe || {
              exec: {
                command: [
                  'bash',
                  '-e',
                  '/scripts/chain-rpc-ready.sh',
                  'http://localhost:26657'
                ]
              },
              initialDelaySeconds: 10,
              periodSeconds: 10,
              timeoutSeconds: 15
            }
          })
    };
  }

  private getValidatorInitScript(chain: Chain): string {
    return `#!/bin/bash
set -euo pipefail

echo "Initializing validator node for ${helpers.getChainId(chain)}..."
${chain.binary} init validator-\${HOSTNAME##*-} --chain-id ${helpers.getChainId(chain)} --home ${chain.home}
echo "Validator initialization completed"`;
  }

  private getValidatorConfigScript(chain: Chain): string {
    return this.scriptManager.getScriptContent(
      chain.scripts?.updateConfig || {
        name: 'update-config.sh',
        data: '/scripts/update-config.sh'
      }
    );
  }

  private getValidatorStartScript(chain: Chain): string {
    return `#!/bin/bash
set -euo pipefail

echo "Starting ${chain.binary} validator..."
exec ${chain.binary} start --home ${chain.home} --log_level info`;
  }

  private getValidatorPostStartScript(chain: Chain): string {
    return `#!/bin/bash
echo "Validator post-start hook for ${helpers.getChainId(chain)}"
# Add any post-start logic here`;
  }
}
