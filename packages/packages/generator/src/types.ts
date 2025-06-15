import { StarshipConfig, Chain, FaucetConfig, Relayer, Script } from '@starship-ci/types/src';

export interface EnvVar {
  name: string;
  value: string | { valueFrom: any };
}

export interface KubernetesManifest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: any;
  data?: any;
}

export interface GeneratorContext {
  config: StarshipConfig;
  namespace?: string;
  version?: string;
}

// Cometmock default configuration
export interface CometmockDefault {
  image: string;
}

// Complete defaults structure from defaults.yaml
export interface DefaultsConfig {
  defaultChains: Record<string, Chain>;
  defaultFaucet: Record<string, FaucetConfig>;
  defaultRelayers: Record<string, Relayer>;
  defaultScripts: Record<string, Script>;
  defaultCometmock: CometmockDefault;
}

// Extended chain with computed properties
export interface ProcessedChain extends Chain {
  hostname: string;
  toBuild: boolean;
  scripts: Record<string, Script>;
}
