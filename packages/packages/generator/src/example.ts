import { DefaultsManager, ScriptManager, TemplateHelpers, CosmosChainBuilder } from './index';
import { StarshipConfig } from '@starship-ci/types/src';

// Example usage of the generator components
export function exampleUsage() {
  // Initialize the defaults manager
  const defaultsManager = new DefaultsManager();
  
  // Initialize the script manager
  const scriptManager = new ScriptManager();
  
  // Example StarshipConfig
  const config: StarshipConfig = {
    name: 'my-starship',
    version: '4.0.0',
    chains: [
      {
        id: 'osmosis-1',
        name: 'osmosis',
        numValidators: 1,
      },
      {
        id: 'cosmoshub-4',
        name: 'cosmoshub',
        numValidators: 2,
      }
    ]
  };

  console.log('Available chain types:', defaultsManager.getAvailableChainTypes());
  
  // Process chains with defaults
  const processedChains = config.chains.map(chain => 
    defaultsManager.processChain(chain)
  );
  
  console.log('Processed chains:', processedChains.map(c => ({
    id: c.id,
    name: c.name,
    hostname: c.hostname,
    image: c.image,
    toBuild: c.toBuild
  })));

  // Example of using the Cosmos chain builder
  const context = { config, namespace: 'starship', version: '4.0.0' };
  const cosmosBuilder = new CosmosChainBuilder(context);

  // Generate manifests for each chain
  config.chains.forEach(chain => {
    console.log(`\n=== Generating manifests for ${chain.id} ===`);
    const manifests = cosmosBuilder.generateChainManifests(chain);
    
    console.log(`Generated ${manifests.length} manifests:`);
    manifests.forEach(manifest => {
      console.log(`- ${manifest.kind}: ${manifest.metadata.name}`);
    });

    // Example: Output the first manifest as YAML-like structure
    if (manifests.length > 0) {
      console.log('\nExample manifest structure:');
      console.log(JSON.stringify(manifests[0], null, 2));
    }
  });

  // Example of helper functions
  console.log('\n=== Helper Functions Examples ===');
  console.log('Chain names:', TemplateHelpers.chainNames(processedChains));
  console.log('Chain IDs:', TemplateHelpers.chainIds(processedChains));
  console.log('RPC addresses:', TemplateHelpers.chainRpcAddrs(processedChains, config));
  console.log('Port map:', TemplateHelpers.getPortMap());

  // Example of script loading
  console.log('\n=== Script Loading Examples ===');
  try {
    const createGenesisScript = scriptManager.loadScript('create-genesis.sh');
    console.log('Loaded create-genesis.sh script length:', createGenesisScript.length);
  } catch (error) {
    console.log('Could not load script:', error instanceof Error ? error.message : String(error));
  }
}

// Example of generating a complete deployment
export function generateCompleteDeployment() {
  const config: StarshipConfig = {
    name: 'cosmos-testnet',
    version: '4.0.0',
    chains: [
      {
        id: 'osmosis-1',
        name: 'osmosis',
        numValidators: 1,
        faucet: {
          enabled: true,
          type: 'cosmjs',
        },
      },
      {
        id: 'cosmoshub-4', 
        name: 'cosmoshub',
        numValidators: 2,
        faucet: {
          enabled: true,
          type: 'starship',
        },
      }
    ],
    exposer: {
      ports: {
        rest: 8081,
      },
    },
    images: {
      imagePullPolicy: 'IfNotPresent',
    },
  };

  const context = { config, namespace: 'starship-testnet', version: '4.0.0' };
  const cosmosBuilder = new CosmosChainBuilder(context);

  const allManifests = [];

  // Generate manifests for all chains
  for (const chain of config.chains) {
    const chainManifests = cosmosBuilder.generateChainManifests(chain);
    allManifests.push(...chainManifests);
  }

  console.log(`\n=== Complete Deployment ===`);
  console.log(`Generated ${allManifests.length} total manifests for ${config.chains.length} chains`);
  
  // Group by kind
  const manifestsByKind = allManifests.reduce((acc, manifest) => {
    const kind = manifest.kind;
    if (!acc[kind]) acc[kind] = [];
    acc[kind].push(manifest);
    return acc;
  }, {} as Record<string, any[]>);

  console.log('\nManifests by type:');
  Object.entries(manifestsByKind).forEach(([kind, manifests]) => {
    console.log(`- ${kind}: ${manifests.length}`);
    manifests.forEach(m => console.log(`  * ${m.metadata.name}`));
  });

  return allManifests;
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('=== Starship Generator Examples ===\n');
  
  try {
    exampleUsage();
    generateCompleteDeployment();
  } catch (error) {
    console.error('Error running examples:', error);
  }
} 