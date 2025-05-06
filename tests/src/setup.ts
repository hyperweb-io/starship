import { ChainConfig } from '@hyperweb-io/starshipjs';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Load config from environment variable or default to two-chain.yaml
const configFile = process.env.TEST_CONFIG_FILE || 'configs/two-chain.yaml';
const configContent = fs.readFileSync(configFile, 'utf8');
export const config: ChainConfig = yaml.load(configContent) as ChainConfig;

// Set Jest timeout to 5 minutes for long-running tests
jest.setTimeout(5 * 60 * 1000); 