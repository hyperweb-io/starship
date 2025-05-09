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
  [K in keyof Ports]?: (chain: Chain) => Promise<VerificationResult>;
};

export type RelayerVerifierSet = {
  [K in keyof Ports]?: (relayer: Relayer) => Promise<VerificationResult>;
};
