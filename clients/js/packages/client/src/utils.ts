import axios from 'axios';

export const handleAxiosError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Handle connection refused errors
    if (error.code === 'ECONNREFUSED') {
      return `Connection refused to ${error.config?.url}`;
    }

    // Handle other axios errors
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }

    // Handle network errors
    if (error.request) {
      return `Network error: ${error.message}`;
    }

    // Handle other axios errors
    return error.message;
  }

  // Handle non-axios errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};
