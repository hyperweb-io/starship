import axios from 'axios';
import { config } from './setup';
import { getAddressFromType } from './utils';

interface FaucetResponse {
  status: string;
}

interface AccountBalance {
  balances: Array<{
    denom: string;
    amount: string;
  }>;
}

interface ChainRegistry {
  chainId: string;
  fees: {
    feeTokens: Array<{
      denom: string;
    }>;
  };
}

interface IBCData {
  chain1: string;
  chain2: string;
  client1: string;
  client2: string;
  connection1: string;
  connection2: string;
  channel1: string;
  channel2: string;
}

async function makeFaucetRequest(chain: any, endpoint: string): Promise<any> {
  const host = `http://0.0.0.0:${chain.ports.faucet}${endpoint}`;
  const response = await axios.get(host);
  return response.data;
}

async function makeChainGetRequest(chain: any, endpoint: string): Promise<any> {
  const url = `http://0.0.0.0:${chain.ports.rest}${endpoint}`;
  const response = await axios.get(url);
  return response.data;
}

async function getChainAccounts(chain: any): Promise<string[]> {
  const data = await makeChainGetRequest(chain, '/cosmos/auth/v1beta1/accounts');
  const accounts: string[] = [];

  for (const acc of data.accounts) {
    if (acc['@type'] === '/cosmos.auth.v1beta1.BaseAccount') {
      accounts.push(acc.address);
    }
  }

  expect(accounts.length).toBeGreaterThanOrEqual(1);
  return accounts;
}

async function getChainDenoms(chain: any): Promise<string> {
  const response = await axios.get(`/chains/${chain.id}`);
  const chainData: ChainRegistry = response.data;
  expect(chainData.chainId).toBe(chain.id);
  expect(chainData.fees.feeTokens[0].denom).toBeTruthy();
  return chainData.fees.feeTokens[0].denom;
}

async function getIBCData(aChain: string, bChain: string): Promise<IBCData> {
  const response = await axios.get(`/ibc/${aChain}/${bChain}`);
  return response.data;
}

async function getAccountBalance(chain: any, address: string, denom: string): Promise<number> {
  const data = await makeChainGetRequest(chain, `/cosmos/bank/v1beta1/balances/${address}`);
  const balance = data.balances.find((b: any) => b.denom === denom);
  return balance ? parseFloat(balance.amount) : 0;
}

async function creditAccount(chain: any, addr: string, denom: string): Promise<void> {
  const response = await axios.post(
    `http://0.0.0.0:${chain.ports.faucet}/credit`,
    {
      denom,
      address: addr,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  expect(response.status).toBe(200);
}

describe('Faucet Tests', () => {
  describe('Status Endpoint', () => {
    it('should return ok status for all chains with faucet', async () => {
      for (const chain of config.chains) {
        if (chain.ports.faucet === 0) {
          console.log(`Skipping faucet test for ${chain.id} - faucet not exposed via ports`);
          continue;
        }

        const response = await makeFaucetRequest(chain, '/status');
        expect(response.status).toBe('ok');
      }
    });
  });

  describe('Credit Endpoint', () => {
    const expectedCreditAmount = 10000000000;

    it('should credit account with expected amount', async () => {
      for (const chain of config.chains) {
        if (chain.ports.faucet === 0) {
          console.log(`Skipping faucet test for ${chain.id} - faucet not exposed via ports`);
          continue;
        }

        const denom = await getChainDenoms(chain);
        const addr = getAddressFromType(chain.name);
        const beforeBalance = await getAccountBalance(chain, addr, denom);

        await creditAccount(chain, addr, denom);

        const afterBalance = await getAccountBalance(chain, addr, denom);
        console.log(`address: ${addr}, after balance: ${afterBalance}, before balance: ${beforeBalance}`);
        expect(afterBalance - beforeBalance).toBeGreaterThanOrEqual(expectedCreditAmount);
      }
    });

    it('should handle multiple credit requests', async () => {
      for (const chain of config.chains) {
        if (chain.ports.faucet === 0) {
          console.log(`Skipping faucet test for ${chain.id} - faucet not exposed via ports`);
          continue;
        }

        const denom = await getChainDenoms(chain);
        const addr = getAddressFromType(chain.name);
        const beforeBalance = await getAccountBalance(chain, addr, denom);

        const numRequests = 3;
        for (let i = 0; i < numRequests; i++) {
          console.log(`crediting account for request: ${i}`);
          await creditAccount(chain, addr, denom);
        }

        const afterBalance = await getAccountBalance(chain, addr, denom);
        console.log(`address: ${addr}, after balance: ${afterBalance}, before balance: ${beforeBalance}`);

        const expectedIncrease = expectedCreditAmount * numRequests;
        const actualIncrease = afterBalance - beforeBalance;
        expect(actualIncrease).toBeGreaterThanOrEqual(
          expectedIncrease,
          `Balance didn't increase as expected. Actual increase: ${actualIncrease}, Expected increase: ${expectedIncrease}`
        );
      }
    });
  });
}); 