import axios from 'axios';

import { Chain, Relayer, StarshipConfig } from '../config';
import { handleAxiosError, VerificationResult } from './types';
import { getServiceUrl } from './utils';

const verifyIngressEndpoint = async (
  url: string,
  service: string,
  endpoint: string
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    service,
    endpoint,
    status: 'failure'
  };

  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      result.status = 'success';
      result.message = `${endpoint} endpoint is accessible`;
      return result;
    }

    result.error = `Failed to access ${endpoint} endpoint`;
    return result;
  } catch (error) {
    result.error = handleAxiosError(error);
    return result;
  }
};

export const verifyChainIngress = async (
  chain: Chain,
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  // Verify REST endpoint
  if (chain.ports?.rest) {
    const { baseUrl, path } = getServiceUrl(config, 'chain', 'rest', String(chain.id));
    results.push(
      await verifyIngressEndpoint(`${baseUrl}${path}`, `chain-${chain.id}`, 'rest')
    );
  }

  // Verify RPC endpoint
  if (chain.ports?.rpc) {
    const { baseUrl, path } = getServiceUrl(config, 'chain', 'rpc', String(chain.id));
    results.push(
      await verifyIngressEndpoint(`${baseUrl}${path}`, `chain-${chain.id}`, 'rpc')
    );
  }

  // Verify Faucet endpoint
  if (chain.ports?.faucet) {
    const { baseUrl, path } = getServiceUrl(config, 'chain', 'faucet', String(chain.id));
    results.push(
      await verifyIngressEndpoint(`${baseUrl}${path}`, `chain-${chain.id}`, 'faucet')
    );
  }

  // Verify Exposer endpoint
  if (chain.ports?.exposer) {
    const { baseUrl, path } = getServiceUrl(config, 'chain', 'exposer', String(chain.id));
    results.push(
      await verifyIngressEndpoint(`${baseUrl}${path}`, `chain-${chain.id}`, 'exposer')
    );
  }

  return results;
};

export const verifyRelayerIngress = async (
  relayer: Relayer,
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (relayer.type === 'hermes') {
    // Verify REST endpoint
    if (relayer.ports?.rest) {
      const { baseUrl, path } = getServiceUrl(config, 'relayer', 'rest', relayer.chains[0]);
      results.push(
        await verifyIngressEndpoint(`${baseUrl}${path}`, `relayer-${relayer.name}`, 'rest')
      );
    }

    // Verify Exposer endpoint
    if (relayer.ports?.exposer) {
      const { baseUrl, path } = getServiceUrl(config, 'relayer', 'exposer', relayer.chains[0]);
      results.push(
        await verifyIngressEndpoint(`${baseUrl}${path}`, `relayer-${relayer.name}`, 'exposer')
      );
    }
  }

  return results;
};

export const verifyRegistryIngress = async (
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (config.registry?.enabled) {
    const { baseUrl, path } = getServiceUrl(config, 'registry', 'rest');
    results.push(await verifyIngressEndpoint(`${baseUrl}${path}`, 'registry', 'rest'));
  }

  return results;
};

export const verifyExplorerIngress = async (
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (config.explorer?.enabled) {
    const { baseUrl, path } = getServiceUrl(config, 'explorer', 'http');
    results.push(await verifyIngressEndpoint(`${baseUrl}${path}`, 'explorer', 'http'));
  }

  return results;
};

export const verifyIngress = async (
  config: StarshipConfig
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (!config.ingress?.enabled || !config.ingress?.host) {
    return results;
  }

  // Verify chain ingress endpoints
  for (const chain of config.chains) {
    results.push(...(await verifyChainIngress(chain, config)));
  }

  // Verify relayer ingress endpoints
  for (const relayer of config.relayers || []) {
    results.push(...(await verifyRelayerIngress(relayer, config)));
  }

  // Verify registry ingress endpoint
  results.push(...(await verifyRegistryIngress(config)));

  // Verify explorer ingress endpoint
  results.push(...(await verifyExplorerIngress(config)));

  return results;
};
