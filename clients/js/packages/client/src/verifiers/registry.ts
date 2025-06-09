import axios from 'axios';

import { Registry, StarshipConfig } from '../config';
import { handleAxiosError, VerificationResult } from './types';
import { getServiceUrl } from './utils';

export const verifyRegistryRest = async (
  registry: Registry,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: 'registry',
    endpoint: 'rest',
    status: 'failure'
  };

  const port = registry.ports?.rest;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(config, 'registry', 'rest');
    const response = await axios.get(`${baseUrl}${path}`);
    result.details = response.data;
    if (response.status !== 200) {
      result.error = 'Failed to get registry chains';
      return result;
    }

    if (response.data.chains?.length > 0) {
      result.status = 'success';
      result.message = 'Registry is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Registry is not working';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Registry service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};
