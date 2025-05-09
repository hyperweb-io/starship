import axios from 'axios';

import { Chain } from '../config';
import { handleAxiosError } from '../utils';
import { ChainVerifierSet, VerificationResult } from './types';

export const verifyChainRest = async (
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
    result.details = response.data;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const verifyChainRpc = async (
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
    result.details = response.data;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const verifyChainFaucet = async (
  chain: Chain
): Promise<VerificationResult> => {
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

    if (!response.data.chainId) {
      result.error = 'Invalid response: chainId not found';
      result.details = response.data;
      return result;
    }

    if (response.data.chainId === chain.id) {
      result.status = 'success';
      result.message = 'Chain faucet is working';
      return result;
    }

    result.status = 'failure';
    result.error = `Chain ID mismatch: expected ${chain.id}, got ${response.data.chainId}`;
    result.details = response.data;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const verifyChainExposer = async (
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
