import axios from 'axios';

import { Explorer } from '../config';
import { handleAxiosError } from '../utils';
import { VerificationResult } from './types';

export const verifyExplorerRest = async (
  explorer: Explorer
): Promise<VerificationResult> => {
  const port = explorer.ports?.rest;
  const result: VerificationResult = {
    service: 'explorer',
    endpoint: 'rest',
    status: 'failure'
  };

  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
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
      return result;
    }

    if (response.data.includes('Ping Dashboard')) {
      result.status = 'success';
      result.message = 'Explorer is working';
      return result;
    }

    result.status = 'failure';
    result.error = 'Explorer is not working';
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};
