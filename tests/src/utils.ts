import { ChainConfig } from 'starshipjs';

export function getAddressFromType(chainName: string): string {
  // This is a simplified version - in reality, we should get this from the chain's genesis accounts
  // For now, we'll use some known test addresses
  const addresses: Record<string, string> = {
    'osmosis': 'osmo1e9ucjn5fjmetky5wezzcsccp7hqcwzrrhthpf5',
    'cosmoshub': 'cosmos1e9ucjn5fjmetky5wezzcsccp7hqcwzrrhthpf5',
    'chain-a': 'cosmos1e9ucjn5fjmetky5wezzcsccp7hqcwzrrhthpf5',
    'chain-b': 'cosmos1e9ucjn5fjmetky5wezzcsccp7hqcwzrrhthpf5',
  };

  return addresses[chainName] || addresses['chain-a'];
} 