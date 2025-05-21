import axios from 'axios';

import { Chain, Relayer, StarshipConfig } from '../config';
import { handleAxiosError, VerificationResult } from './types';

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
  host: string
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  // Verify REST endpoint
  if (chain.ports?.rest) {
    const restUrl = getServiceUrl(
      chain.id,
      host,
      'rest',
      '/cosmos/bank/v1beta1/supply'
    );
    results.push(
      await verifyIngressEndpoint(restUrl, `chain-${chain.id}`, 'rest')
    );
  }

  // Verify RPC endpoint
  if (chain.ports?.rpc) {
    const rpcUrl = `https://rpc.${chain.id}-genesis.${host}/status`;
    results.push(
      await verifyIngressEndpoint(rpcUrl, `chain-${chain.id}`, 'rpc')
    );
  }

  // Verify Faucet endpoint
  if (chain.ports?.faucet) {
    const faucetUrl = `https://rest.${chain.id}-genesis.${host}/faucet/status`;
    results.push(
      await verifyIngressEndpoint(faucetUrl, `chain-${chain.id}`, 'faucet')
    );
  }

  // Verify Exposer endpoint
  if (chain.ports?.exposer) {
    const exposerUrl = `https://rest.${chain.id}-genesis.${host}/exposer/node_id`;
    results.push(
      await verifyIngressEndpoint(exposerUrl, `chain-${chain.id}`, 'exposer')
    );
  }

  return results;
};

export const verifyRelayerIngress = async (
  relayer: Relayer,
  host: string
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (relayer.type === 'hermes') {
    // Verify REST endpoint
    if (relayer.ports?.rest) {
      const restUrl = `https://rest.hermes-${relayer.name}.${host}/status`;
      results.push(
        await verifyIngressEndpoint(restUrl, `relayer-${relayer.name}`, 'rest')
      );
    }

    // Verify Exposer endpoint
    if (relayer.ports?.exposer) {
      const exposerUrl = `https://rest.hermes-${relayer.name}.${host}/exposer/config`;
      results.push(
        await verifyIngressEndpoint(
          exposerUrl,
          `relayer-${relayer.name}`,
          'exposer'
        )
      );
    }
  }

  return results;
};

export const verifyRegistryIngress = async (
  config: StarshipConfig,
  host: string
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (config.registry?.enabled) {
    const registryUrl = `https://registry.${host}/chains`;
    results.push(await verifyIngressEndpoint(registryUrl, 'registry', 'rest'));
  }

  return results;
};

export const verifyExplorerIngress = async (
  config: StarshipConfig,
  host: string
): Promise<VerificationResult[]> => {
  const results: VerificationResult[] = [];

  if (config.explorer?.enabled) {
    const explorerUrl = `https://explorer.${host}`;
    results.push(await verifyIngressEndpoint(explorerUrl, 'explorer', 'http'));
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

  const host = config.ingress.host.replace('*.', '');

  // Verify chain ingress endpoints
  for (const chain of config.chains) {
    results.push(...(await verifyChainIngress(chain, host)));
  }

  // Verify relayer ingress endpoints
  for (const relayer of config.relayers || []) {
    results.push(...(await verifyRelayerIngress(relayer, host)));
  }

  // Verify registry ingress endpoint
  results.push(...(await verifyRegistryIngress(config, host)));

  // Verify explorer ingress endpoint
  results.push(...(await verifyExplorerIngress(config, host)));

  return results;
};
