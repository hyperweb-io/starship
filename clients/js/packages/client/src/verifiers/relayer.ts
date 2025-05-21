import axios from 'axios';
import { Relayer, StarshipConfig } from '../config';
import { getServiceUrl } from './utils';
import { RelayerVerifierSet, VerificationResult, handleAxiosError } from './types';

export const verifyRelayerRest = async (
  relayer: Relayer,
  config: StarshipConfig
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
    const { baseUrl, path } = getServiceUrl(config, 'relayer', 'rest', relayer.chains[0]);
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get relayer status';
      return result;
    }

    if (response.data.status === 'ok') {
      result.status = 'success';
      result.message = 'Relayer REST is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid relayer status';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Relayer REST service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

export const verifyRelayerExposer = async (
  relayer: Relayer,
  config: StarshipConfig
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

  if (!relayer.chains || relayer.chains.length === 0) {
    result.status = 'skipped';
    result.error = 'No chains configured for relayer';
    return result;
  }
  try {
    const { baseUrl, path } = getServiceUrl(config, 'relayer', 'exposer', relayer.chains[0]);
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get relayer config';
      return result;
    }

    if (response.data && response.data.connections) {
      result.status = 'success';
      result.message = 'Relayer config is valid';
      return result;
    }

    result.status = 'failure';
    result.error = 'Invalid relayer config';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Relayer exposer service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};

export const relayerVerifiers: RelayerVerifierSet = {
  rest: verifyRelayerRest,
  exposer: verifyRelayerExposer
};
