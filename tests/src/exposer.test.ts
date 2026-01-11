import axios from 'axios';
import { ChainConfig } from './utils';

interface ExposerResponse {
  nodeId?: string;
  key?: string;
  type?: string;
  pubKey?: string;
  address?: string;
  height?: string;
  privKey?: string;
  genesis?: any[];
  validators?: any[];
  keys?: any[];
  relayers?: any[];
  relayersCli?: any[];
}

describe('Exposer Tests', () => {
  const config = (global as any).testConfig;
  let chain1Config: ChainConfig;

  beforeAll(() => {
    chain1Config = {
      rpc: `http://localhost:${config.ports.chain1.rpc}`,
      rest: `http://localhost:${config.ports.chain1.rest}`,
      chainId: config.chains[0].chainId,
      prefix: config.chains[0].prefix,
    };
  });

  const makeExposerRequest = async (
    chain: any,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<ExposerResponse> => {
    if (chain.ports.exposer === 0) {
      throw new Error('No exposer port available');
    }

    const url = `http://localhost:${chain.ports.exposer}${endpoint}`;
    const response = await axios({
      method,
      url,
      data: body,
    });

    return response.data;
  };

  it('should get node ID', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/node_id');
    expect(response.nodeId).toBeTruthy();
  });

  it('should get genesis file', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/genesis');
    expect(response).toBeTruthy();
    expect(response.chain_id).toBe(chain.id);
  });

  it('should get public key', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }
    if (chain.cometmock?.enabled) {
      return;
    }

    const response = await makeExposerRequest(chain, '/pub_key');
    expect(response).toBeTruthy();
    expect(response.key).toBeTruthy();
    expect(response.type).toBe('/cosmos.crypto.ed25519.PubKey');
  });

  it('should get private keys', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/priv_keys');
    expect(response).toBeTruthy();
    expect(response.pubKey).toBeTruthy();
    expect(response.address).toBeTruthy();
  });

  it('should get private validator state', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/priv_validator_state');
    expect(response).toBeTruthy();
    expect(response.height).toBeTruthy();
  });

  it('should get node key', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/node_key');
    expect(response).toBeTruthy();
    expect(response.privKey).toBeTruthy();
  });

  it('should get all keys', async () => {
    const chain = config.chains[0];
    if (chain.ports.exposer === 0) {
      return;
    }

    const response = await makeExposerRequest(chain, '/keys');
    expect(response).toBeTruthy();
    expect(response.genesis).toHaveLength(1);
    expect(response.validators).toHaveLength(1);
    expect(response.keys).toHaveLength(3);
    expect(response.relayers).toHaveLength(5);
    expect(response.relayersCli).toHaveLength(5);
  });

  it('should create channel', async () => {
    if (!config.relayers) {
      return;
    }

    for (const relayer of config.relayers) {
      if (relayer.type !== 'hermes' || relayer.ports.exposer === 0) {
        continue;
      }

      // Get IBC data before creating channel
      const ibcDataBefore = await getIBCData(relayer.chains[0], relayer.chains[1]);
      expect(ibcDataBefore.channels.length).toBeGreaterThanOrEqual(1);

      const body = {
        a_chain: relayer.chains[0],
        a_connection: ibcDataBefore.chain_1.connectionId,
        a_port: 'transfer',
        b_port: 'transfer',
      };

      const response = await makeExposerRequest(
        relayer,
        '/create_channel',
        'POST',
        body
      );

      expect(response.status).toContain('SUCCESS Channel');

      // Get IBC data after creating channel
      const ibcDataAfter = await getIBCData(relayer.chains[0], relayer.chains[1]);
      expect(ibcDataAfter.channels.length).toBe(ibcDataBefore.channels.length + 1);
    }
  });
}); 