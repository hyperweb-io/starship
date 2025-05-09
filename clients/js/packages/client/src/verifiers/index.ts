import { chainVerifiers } from './chain';
import { verifyExplorerRest } from './explorer';
import { verifyRegistryRest } from './registry';
import { relayerVerifiers } from './relayer';
import { VerificationFunction, VerificationResult } from './types';

export const verifyChains: VerificationFunction = async (config) => {
  const results: VerificationResult[] = [];

  if (!config.chains) {
    return results;
  }

  for (const chain of config.chains) {
    const verifierSet = chainVerifiers[chain.name] || chainVerifiers.default;
    for (const [, verifier] of Object.entries(verifierSet)) {
      const result = await verifier(chain);
      results.push(result);
    }
  }

  return results;
};

export const verifyRelayers: VerificationFunction = async (config) => {
  const results: VerificationResult[] = [];

  if (!config.relayers) {
    return results;
  }

  for (const relayer of config.relayers) {
    for (const [, verifier] of Object.entries(relayerVerifiers)) {
      const result = await verifier(relayer);
      results.push(result);
    }
  }

  return results;
};

export const verifyRegistry: VerificationFunction = async (config) => {
  const results: VerificationResult[] = [];

  if (!config.registry?.enabled) {
    return results;
  }

  const registryResults = await Promise.all([
    verifyRegistryRest(config.registry)
  ]);

  results.push(...registryResults);
  return results;
};

export const verifyExplorer: VerificationFunction = async (config) => {
  const results: VerificationResult[] = [];

  if (!config.explorer?.enabled) {
    return results;
  }

  const explorerResult = await verifyExplorerRest(config.explorer);
  results.push(explorerResult);
  return results;
};

export const verify: VerificationFunction = async (config) => {
  const chainResults = await verifyChains(config);
  const relayerResults = await verifyRelayers(config);
  const registryResults = await verifyRegistry(config);
  const explorerResults = await verifyExplorer(config);

  return [
    ...chainResults,
    ...relayerResults,
    ...registryResults,
    ...explorerResults
  ];
};

export * from './chain';
export * from './explorer';
export * from './registry';
export * from './relayer';
export * from './types';
