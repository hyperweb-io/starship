import axios from 'axios';

import { Registry } from '../config';
import { handleAxiosError } from '../utils';
import { VerificationResult } from './types';

export const verifyRegistryRest = async (
  registry: Registry
): Promise<VerificationResult> => {
  const port = registry.ports?.rest;
  const result: VerificationResult = {
    service: 'registry',
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const response = await axios.get(`http://localhost:${port}/chains`);
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
    result.error = handleAxiosError(error);
    return result;
  }
};
