import axios from 'axios';

import { Relayer } from '../config';
import { handleAxiosError } from '../utils';
import { RelayerVerifierSet, VerificationResult } from './types';

export const verifyRelayerRest = async (
  relayer: Relayer
): Promise<VerificationResult> => {
  const port = relayer.ports?.rest;
  const result: VerificationResult = {
    service: `relayer-${relayer.name}`,
    endpoint: 'rest',
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
      result.error = 'Failed to get relayer status';
      return result;
    }

    if (response.data.connections && response.data.connections.length > 0) {
      result.status = 'success';
      result.message = 'Relayer has active connections';
      return result;
    }

    result.status = 'failure';
    result.error = 'No active connections found';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        result.error = 'Relayer endpoint not found';
      } else if (error.code === 'ECONNREFUSED') {
        result.error = 'Relayer service is not running';
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
  relayer: Relayer
): Promise<VerificationResult> => {
  const port = relayer.ports?.exposer;
  const result: VerificationResult = {
    service: `relayer-${relayer.name}`,
    endpoint: 'exposer',
    status: 'failure'
  };

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
      if (error.response?.status === 404) {
        result.error = 'Relayer exposer endpoint not found';
      } else if (error.response?.status === 500) {
        result.error = 'Relayer exposer service error';
      } else if (error.code === 'ECONNREFUSED') {
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
