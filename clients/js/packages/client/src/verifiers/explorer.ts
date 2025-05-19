import axios from 'axios';
import { Explorer, StarshipConfig } from '../config';
import { getServiceUrl } from './utils';
import { VerificationResult, handleAxiosError } from './types';

export const verifyExplorerRest = async (
  explorer: Explorer,
  config: StarshipConfig
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service: 'explorer',
    endpoint: 'http',
    status: 'failure'
  };

  const port = explorer.ports?.http;
  if (!port) {
    result.status = 'skipped';
    result.error = 'Port not found';
    return result;
  }

  try {
    const { baseUrl, path } = getServiceUrl(config, 'explorer', 'http');
    const response = await axios.get(`${baseUrl}${path}`);
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
    result.error = 'Invalid explorer response';
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        result.error = 'Explorer service is not running';
      } else {
        result.error = handleAxiosError(error);
      }
    } else {
      result.error = 'Unknown error occurred';
    }
    return result;
  }
};
