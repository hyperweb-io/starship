import axios from 'axios';

describe('E2E Tests', () => {
  const config = (global as any).testConfig;

  const makeRequest = async (url: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    const response = await axios({
      method,
      url,
      data: body,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    });
    return response.data;
  };

  it('should check chain status', async () => {
    for (const chain of config.chains) {
      if (chain.name === 'neutron' || chain.name === 'ethereum') {
        continue;
      }

      const response = await makeRequest(`http://localhost:${chain.ports.rpc}/status`);
      expect(response.result.node_info.network).toBe(chain.id);
    }
  });

  it('should check staking parameters', async () => {
    if (config.chains[0].ports.rest === 0) {
      return;
    }
    if (config.chains[0].name === 'neutron' || config.chains[0].name === 'ethereum') {
      return;
    }

    let expUnbondingTime = '300s'; // default value
    switch (config.configFile) {
      case 'configs/one-chain.yaml':
        expUnbondingTime = '5s'; // based on genesis override in one-chain.yaml file
        break;
      case 'configs/one-chain-custom-scripts.yaml':
        expUnbondingTime = '15s'; // based on genesis override in the custom script
        break;
    }

    const response = await makeRequest(
      `http://localhost:${config.chains[0].ports.rest}/cosmos/staking/v1beta1/params`
    );
    expect(response.params.unbonding_time).toBe(expUnbondingTime);
  });

  it('should check relayer state', async () => {
    if (!config.relayers) {
      return;
    }

    for (const relayer of config.relayers) {
      if (relayer.type !== 'hermes' || relayer.ports.rest === 0) {
        continue;
      }

      const response = await makeRequest(`http://localhost:${relayer.ports.rest}/state`);
      expect(response.status).toBe('success');
    }
  });

  it('should check chain balances', async () => {
    if (config.chains[0].ports.rest === 0) {
      return;
    }
    if (config.configFile !== 'configs/one-chain.yaml') {
      return;
    }

    for (const chain of config.chains) {
      for (const balance of chain.balances) {
        const response = await makeRequest(
          `http://localhost:${chain.ports.rest}/cosmos/bank/v1beta1/balances/${balance.address}`
        );

        expect(response.balances).toHaveLength(1);
        const balanceData = response.balances[0];
        const coins = `${balanceData.amount}${balanceData.denom}`;
        expect(coins).toBe(balance.amount);
      }
    }
  });

  it('should check ethereum block number', async () => {
    for (const chain of config.chains) {
      if (!chain.name.startsWith('ethereum')) {
        continue;
      }

      const response = await makeRequest(
        `http://localhost:${chain.ports.rest}`,
        'POST',
        {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }
      );

      const blockNumber = parseInt(response.result.slice(2), 16);
      expect(blockNumber).toBeGreaterThan(0);
    }
  });

  it('should check ethereum balances', async () => {
    for (const chain of config.chains) {
      if (chain.name !== 'ethereum') {
        continue;
      }

      const balances = chain.balances || [];
      balances.push({
        address: '0x0000000000000000000000000000000000000001',
        amount: '0x3635c9adc5dea00000',
      });

      for (const balance of balances) {
        const response = await makeRequest(
          `http://localhost:${chain.ports.rest}`,
          'POST',
          {
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [balance.address, 'latest'],
            id: 1,
          }
        );

        expect(response.result).toBe(balance.amount);
      }
    }
  });
}); 