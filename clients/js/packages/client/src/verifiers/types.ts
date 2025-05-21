import { Chain, Ports, Relayer, StarshipConfig } from '../config';

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

export type ChainVerifierSet = {
  [K in keyof Ports]?: (
    chain: Chain,
    config: StarshipConfig
  ) => Promise<VerificationResult>;
};

export type RelayerVerifierSet = {
  [K in keyof Ports]?: (
    relayer: Relayer,
    config: StarshipConfig
  ) => Promise<VerificationResult>;
};

export const handleAxiosError = (error: any): string => {
  if (error.response) {
    return `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`;
  }
  if (error.request) {
    return `No response received: ${error.message}`;
  }
  return error.message || 'Unknown error occurred';
};
