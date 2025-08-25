import { Asset } from '@chain-registry/types';

// Base types
export interface Ports {
  rest?: number;
  rpc?: number;
  grpc?: number;
  'grpc-web'?: number;
  exposer?: number;
  faucet?: number;
  prometheus?: number;
  grafana?: number;
  cometmock?: number;
  ws?: number;
  'evm-rpc'?: number;
  'evm-ws'?: number;
}

export interface Resources {
  cpu?: string | number;
  memory?: string | number;
  limits?: {
    cpu: string | number;
    memory: string | number;
  };
  requests?: {
    cpu: string | number;
    memory: string | number;
  };
}

export interface TimeoutConfig {
  time_iota_ms?: number;
  timeout_propose?: string;
  timeout_propose_delta?: string;
  timeout_prevote?: string;
  timeout_prevote_delta?: string;
  timeout_precommit?: string;
  timeout_precommit_delta?: string;
  timeout_commit?: string;
}

// Component configs
export interface FaucetConfig {
  enabled: boolean;
  type?: 'cosmjs' | 'starship';
  image?: string;
  concurrency?: number;
  ports?: Ports;
  resources?: Resources;
}

export type ChainName =
  | 'custom'
  | 'osmosis'
  | 'cosmoshub'
  | 'juno'
  | 'stride'
  | 'ics'
  | 'cronos'
  | 'cryptoorgchain'
  | 'evmos'
  | 'persistencecore'
  | 'regen'
  | 'quasar'
  | 'quicksilver'
  | 'sei'
  | 'sommelier'
  | 'stargaze'
  | 'tendermint'
  | 'umee'
  | 'wasmd'
  | 'simapp'
  | 'cheqd'
  | 'neutron'
  | 'injective'
  | 'polymer'
  | 'virtual'
  | 'akash'
  | 'agoric'
  | 'kujira'
  | 'hyperweb'
  | 'noble'
  | 'xpla'
  | 'ethereum';

export interface ChainScripts {
  createGenesis?: Script;
  updateGenesis?: Script;
  updateConfig?: Script;
  createValidator?: Script;
  transferTokens?: Script;
  buildChain?: Script;
  chainRpcReady?: Script;
  ibcConnection?: Script;
  createICS?: Script;
}

export interface Env {
  name: string;
  value: string;
}

export interface Balance {
  address: string;
  amount: string;
}

export interface Upgrade {
  enabled: boolean;
  type?: 'build';
  genesis?: string;
  upgrades?: {
    name: string;
    version: string;
  }[];
}

export interface Chain {
  id: string | number;
  name: ChainName;
  numValidators: number;
  image?: string;
  home?: string;
  binary?: string;
  prefix?: string;
  denom?: string;
  prettyName?: string;
  coins?: string;
  hdPath?: string;
  coinType?: number;
  metrics?: boolean;
  repo?: string;
  assets?: Asset[];
  upgrade?: Upgrade;
  faucet?: FaucetConfig;
  ports?: Ports;
  build?: {
    enabled: boolean;
    source: string;
  };
  genesis?: Record<string, any>;
  scripts?: ChainScripts;
  env?: Env[];
  ics?: ICS;
  cometmock?: Cometmock;
  balances?: Balance[];
  readinessProbe?: Record<string, any>;
  config?: Record<string, any>;
  resources?: Resources;
}

export interface Script {
  name?: string;
  file?: string;
  data?: string;
}

export interface Channel {
  'a-chain': string;
  'b-chain'?: string;
  'a-port': string;
  'b-port': string;
  'a-connection'?: string;
  'new-connection'?: boolean;
  'channel-version'?: number;
  order?: string;
}

export interface ICS {
  enabled: boolean;
  provider?: string;
  consumer?: string;
}

export interface Cometmock {
  enabled: boolean;
  image?: string;
}

export interface Relayer {
  name: string;
  type: 'go-relayer' | 'hermes' | 'ts-relayer' | 'neutron-query-relayer';
  image?: string;
  replicas: number;
  chains: string[];
  config?: Record<string, any>;
  channels?: Channel[];
  ics?: ICS;
  resources?: Resources;
  ports?: Ports;
}

export interface Explorer {
  enabled: boolean;
  type: 'ping-pub';
  image?: string;
  localhost?: boolean;
  ports?: Ports;
  resources?: Resources;
}

export interface Registry {
  enabled: boolean;
  image: string;
  localhost?: boolean;
  ports?: Ports;
  resources?: Resources;
}

export interface Monitoring {
  enabled: boolean;
  ports?: Ports;
  resources?: Resources;
}

export interface Ingress {
  enabled: boolean;
  type: 'nginx';
  host?: string;
  certManager?: {
    issuer?: string;
  };
  resources?: Resources;
}

export interface Images {
  imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';
}

export interface Frontend {
  name: string;
  type: 'custom';
  image: string;
  replicas?: number;
  ports?: Ports;
  env?: Env[];
  resources?: Resources;
}

export interface Exposer {
  image?: string;
  ports?: Ports;
  resources?: Resources;
}

// Main config interface
export interface StarshipConfig {
  name: string;
  resources?: {
    node?: Resources;
    wait?: Resources;
  };
  exposer?: Exposer;
  faucet?: FaucetConfig;
  timeouts?: TimeoutConfig;
  chains: Chain[];
  relayers?: Relayer[];
  explorer?: Explorer;
  registry?: Registry;
  monitoring?: Monitoring;
  ingress?: Ingress;
  images?: Images;
  frontends?: Frontend[];
}
