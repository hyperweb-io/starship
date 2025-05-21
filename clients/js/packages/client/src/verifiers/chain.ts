import axios from 'axios';

import { Chain, StarshipConfig } from '../config';
import {
  ChainVerifierSet,
  handleAxiosError,
  VerificationResult
} from './types';
import { getServiceUrl } from './utils';

export const verifyChainRest = async (
  chain: Chain,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rest',
    status: 'failure'
  };

  const port = chain.ports?.rest;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(
      config,
      'chain',
      'rest',
      String(chain.id)
    );
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain supply';
      return result;
    }

    if (response.data.supply) {
      result.status = 'success';
      result.message = 'Chain REST is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid supply response';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Chain REST service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

export const verifyChainRpc = async (
  chain: Chain,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'rpc',
    status: 'failure'
  };

  const port = chain.ports?.rpc;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(
      config,
      'chain',
      'rpc',
      String(chain.id)
    );
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain status';
      return result;
    }

    if (response.data.result?.sync_info) {
      result.status = 'success';
      result.message = 'Chain RPC is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid status response';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Chain RPC service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

export const verifyChainFaucet = async (
  chain: Chain,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'faucet',
    status: 'failure'
  };

  const port = chain.ports?.faucet;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(
      config,
      'chain',
      'faucet',
      String(chain.id)
    );
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get faucet status';
      return result;
    }

    if (response.data.chainId) {
      result.status = 'success';
      result.message = 'Chain faucet is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid faucet response';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Faucet service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

export const verifyChainExposer = async (
  chain: Chain,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: `chain-${chain.id}`,
    endpoint: 'exposer',
    status: 'failure'
  };

  const port = chain.ports?.exposer;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(
      config,
      'chain',
      'exposer',
      String(chain.id)
    );
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get chain node id';
      return result;
    }

    if (response.data && response.data.node_id) {
      result.status = 'success';
      result.message = 'Chain exposer is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid node_id response';
    result.details = response.data;
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
export const verifyEthereumRest = async (
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
    result.details = response.data;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const verifyEthereumRpc = async (
  chain: Chain
): Promise<VerificationResult> => {
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
    result.details = response.data;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const chainVerifiers: {
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
