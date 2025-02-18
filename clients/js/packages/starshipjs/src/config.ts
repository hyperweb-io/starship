import { ChainRegistryFetcher } from '@chain-registry/client';

import { useRegistry } from './hooks';

export class Config {
  // keep instantiation private to enforce singletone
  private constructor() {}
  public registry?: ChainRegistryFetcher;
  public configFile?: string;
  private isConfigInitialized = false;
  private isRegistryInitialized = false;

  private static instance: Config;

  setConfigFile(configFile: string) {
    this.configFile = configFile;
    this.isConfigInitialized = true;
  }

  setRegistry(registry: ChainRegistryFetcher) {
    this.registry = registry;
    this.isRegistryInitialized = true;
  }

  private get isInitialized() {
    return this.isConfigInitialized && this.isRegistryInitialized;
  }

  // init config with a config file and an optional registry fetcher
  // if no registry fetcher is provided, it will use the default registry fetcher
  // by enforcing the use of the init method, we can ensure that the config is initialized
  public static async init(
    configFile: string,
    registryFetcher?: ChainRegistryFetcher
  ) {
    if (Config.instance && Config.instance.isInitialized) {
      throw new Error('Config is already initialized.');
    }

    const fetcher = registryFetcher ?? (await useRegistry(configFile));

    Config.instance = new Config();
    Config.instance.setConfigFile(configFile);
    Config.instance.setRegistry(fetcher);
  }

  public static getInstance(): Config {
    if (!Config.instance || !Config.instance.isInitialized) {
      throw new Error("Config's not initialized.");
    }

    return Config.instance;
  }

  /**
   * set the config file path
   * @param configFile
   * @depracated it's not recommended to set the configFile directly. Use init instead.
   */
  public static setConfigFile(configFile: string) {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    Config.instance.setConfigFile(configFile);
  }

  /**
   * set the chain registry fetcher
   * @param registry
   * @depracated it's not recommended to set the registry directly. Use init instead.
   */
  public static setRegistry(registry: ChainRegistryFetcher) {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    Config.instance.setRegistry(registry);
  }

  public static get configFile() {
    // use getInstance to ensure that the config is initialized.
    return Config.getInstance().configFile;
  }

  public static get registry() {
    // use getInstance to ensure that the config is initialized.
    return Config.getInstance().registry;
  }
}

export interface ChainConfig {
  registry: {
    ports: {
      rest: number;
    };
  };
  chains: Array<{
    id: string | number;
    name: string;
    ports: {
      rpc: number;
      rest: number;
      faucet: number;
    };
  }>;
  relayers: Array<{
    chains: [string, string];
  }>;
}

export const ConfigContext = Config;
