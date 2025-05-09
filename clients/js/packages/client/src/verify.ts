import axios from 'axios';

import { Chain, Ports, Relayer, StarshipConfig } from './config';
import { handleAxiosError } from './utils';

export interface VerificationResult {
  service: string;
  endpoint: string;
  status: 'success' | 'failure' | 'skipped';
  message?: string;
  error?: string;
  details?: any;
}

export type VerificationFunction = (
  config: StarshipConfig
) => Promise<VerificationResult[]>;

// Individual verification functions
const verifyChainRest = async (chain: Chain): Promise<VerificationResult> => {
  const port = chain.ports?.rest;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(
      `http://localhost:${port}/cosmos/bank/v1beta1/supply`
    );
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain supply';
      return result;
    }
    if (response.data.supply[0].amount > 0) {
      result.status = 'success';
      result.message = 'Chain supply is greater than 0';
      return result;
    }

    result.status = 'failure';
    result.error = 'Chain supply not confirmed';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

const verifyChainRpc = async (chain: Chain): Promise<VerificationResult> => {
  const port = chain.ports?.rpc;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rpc',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/status`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain node info';
      return result;
    }

    const blockHeight = Number(
      response.data.result?.sync_info?.latest_block_height ||
        response.data.result?.SyncInfo?.latest_block_height
    );

    if (blockHeight > 0) {
      result.status = 'success';
      result.message = 'Chain is synced';
      return result;
    }

    result.status = 'failure';
    result.error = 'Block height is 0';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

const verifyChainFaucet = async (chain: Chain): Promise<VerificationResult> => {
  const port = chain.ports?.faucet;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'faucet',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/status`);
    if (response.status !== 200) {
      result.error = 'Failed to get chain node info';
      return result;
    }

    if (response.data.chainId === chain.id) {
      result.status = 'success';
      result.message = 'Chain faucet is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Chain faucet is not working';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

const verifyChainExposer = async (
  chain: Chain
): Promise<VerificationResult> => {
  const port = chain.ports?.exposer;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'exposer',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/node_id`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain node id';
      return result;
    }

    // Check if we have a valid node_id in the response
    if (response.data && response.data.node_id) {
      result.status = 'success';
      result.message = 'Chain exposer is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid node_id response';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Exposer service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

// Ethereum specific verifiers
const verifyEthereumRest = async (
  chain: Chain
): Promise<VerificationResult> => {
  const port = chain.ports?.rest;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.post(`http://localhost:${port}`, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get block number';
      return result;
    }

    if (response.data.result) {
      result.status = 'success';
      result.message = 'Ethereum node is responding';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid response from Ethereum node';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

const verifyEthereumRpc = async (chain: Chain): Promise<VerificationResult> => {
  const port = chain.ports?.rpc;
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rpc',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.post(`http://localhost:${port}`, {
      jsonrpc: '2.0',
      method: 'eth_syncing',
      params: [],
      id: 1
    });
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get sync status';
      return result;
    }

    if (
      typeof response.data.result === 'boolean' ||
      response.data.result === false
    ) {
      result.status = 'success';
      result.message = 'Ethereum node is synced';
      return result;
    }

    result.status = 'failure';
    result.error = 'Ethereum node is still syncing';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

// Relayer verifiers
const verifyRelayerRest = async (
  relayer: Relayer
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `relayer-${relayer.name}`,
    endpoint: 'rest',
    status: 'failure'
  };

  const port = relayer.ports?.rest;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/version`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get relayer version';
      return result;
    }

    if (response.data.status === 'success') {
      result.status = 'success';
      result.message = 'Relayer is running';
      return result;
    }

    result.status = 'failure';
    result.error = 'Relayer is not in success state';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

const verifyRelayerExposer = async (
  relayer: Relayer
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `relayer-${relayer.name}`,
    endpoint: 'exposer',
    status: 'failure'
  };

  const port = relayer.ports?.exposer;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/config`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get relayer config';
      return result;
    }

    if (response.data.chains && response.data.chains.length > 0) {
      result.status = 'success';
      result.message = 'Relayer exposer is working with valid config';
      return result;
    }

    result.status = 'failure';
    result.error = 'Relayer config is invalid or empty';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 500) {
      const errorBody = error.response.data;
      if (
        errorBody.code === 2 &&
        errorBody.message === 'open : no such file or directory' &&
        Array.isArray(errorBody.details) &&
        errorBody.details.length === 0
      ) {
        result.status = 'success';
        result.message = 'Relayer exposer is working with empty config';
        return result;
      }
    }
    result.error = handleAxiosError(error);
    return result;
  }
};

// Registry verifiers
const verifyRegistryRest = async (
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const port = config.registry?.ports?.rest;
  const result: VerificationResult = {
    service: `registry`,
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return [result];
  }

  try {
    const response = await axios.get(`http://localhost:${port}/chains`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get registry chains';
      return [result];
    }

    if (response.data.chains?.length > 0) {
      result.status = 'success';
      result.message = 'Registry is working';
      return [result];
    }

    result.status = 'failure';
    result.error = 'Registry is not working';
    return [result];
  } catch (error) {
    result.error = handleAxiosError(error);
    return [result];
  }
};

// Explorer verifiers
const verifyExplorerRest = async (
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const port = config.explorer?.ports?.rest;
  const result: VerificationResult = {
    service: `explorer`,
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return [result];
  }

  try {
    const response = await axios.get(`http://localhost:${port}`, {
      headers: {
        Accept: 'text/html'
      }
    });
    result.details = response.data;

    if (response.status !== 200) {
      result.error = 'Failed to get explorer status';
      return [result];
    }

    if (response.data.includes('Ping Dashboard')) {
      result.status = 'success';
      result.message = 'Explorer is working';
      return [result];
    }

    result.status = 'failure';
    result.error = 'Explorer is not working';
    return [result];
  } catch (error) {
    result.error = handleAxiosError(error);
    return [result];
  }
};

// Relayer verifiers map
type RelayerVerifierSet = {
  [K in keyof Ports]?: (relayer: Relayer) => Promise<VerificationResult>;
};

const relayerVerifiers: {
  default: RelayerVerifierSet;
  [relayerType: string]: RelayerVerifierSet;
} = {
  default: {
    rest: verifyRelayerRest,
    exposer: verifyRelayerExposer
  }
};

// Chain verifiers map
type ChainVerifierSet = {
  [K in keyof Ports]?: (chain: Chain) => Promise<VerificationResult>;
};

const chainVerifiers: {
  default: ChainVerifierSet;
  [chainName: string]: ChainVerifierSet;
} = {
  default: {
    rest: verifyChainRest,
    rpc: verifyChainRpc,
    faucet: verifyChainFaucet,
    exposer: verifyChainExposer
  },
  ethereum: {
    rest: verifyEthereumRest,
    rpc: verifyEthereumRpc
  }
};

export class VerificationRegistry {
  private verifiers: Map<string, VerificationFunction[]> = new Map();

  register(service: string, verifier: VerificationFunction) {
    if (!this.verifiers.has(service)) {
      this.verifiers.set(service, []);
    }
    this.verifiers.get(service)!.push(verifier);
  }

  async run(config: StarshipConfig): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const [service, verifiers] of this.verifiers.entries()) {
      for (const verifier of verifiers) {
        try {
          const result = await verifier(config);
          results.push(...result);
        } catch (error) {
          results.push({
            service,
            endpoint: 'unknown',
            status: 'failure',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }
}

// Default verifiers
export const createDefaultVerifiers = (registry: VerificationRegistry) => {
  // Chain verification
  registry.register('chain', async (config) => {
    const results: VerificationResult[] = [];

    for (const chain of config.chains) {
      const verifier = chainVerifiers[chain.name] || chainVerifiers.default;

      const chainResults = await Promise.all(
        [
          verifier.rest?.(chain),
          verifier.rpc?.(chain),
          verifier.faucet?.(chain),
          verifier.exposer?.(chain)
        ].filter(Boolean)
      );
      results.push(...chainResults);
    }

    for (const relayer of config.relayers || []) {
      const verifier =
        relayerVerifiers[relayer.type] || relayerVerifiers.default;

      const relayerResults = await Promise.all(
        [verifier.rest?.(relayer), verifier.exposer?.(relayer)].filter(Boolean)
      );
      results.push(...relayerResults);
    }
    return results;
  });

  // Registry verification
  registry.register('registry', verifyRegistryRest);

  // Explorer verification
  registry.register('explorer', verifyExplorerRest);
};
