import { DefaultsManager, ScriptManager, TemplateHelpers } from './index';
import { StarshipConfig } from '@starship-ci/types';

// Example usage of the generator components
export function exampleUsage() {
  // Initialize the defaults manager
  const defaultsManager = new DefaultsManager();
  
  // Initialize the script manager
  const scriptManager = new ScriptManager();
  
  // Example StarshipConfig
  const config: StarshipConfig = {
    name: 'my-starship',
    version: '1.0.0',
    chains: [
      {
        id: 'osmosis-1',
        name: 'osmosis',
        numValidators: 1,
      },
      {
        id: 'cosmoshub-4',
        name: 'cosmoshub',
        numValidators: 1,
      }
    ]
  };

  console.log('Available chain types:', defaultsManager.getAvailableChainTypes());
  
  // Process chains with defaults
  const processedChains = config.chains.map(chain => 
    defaultsManager.processChain(chain)
  );
  
  console.log('Processed chains:');
  processedChains.forEach(chain => {
    console.log(`- ${chain.id}: ${chain.hostname} (image: ${chain.image})`);
    console.log(`  Scripts: ${Object.keys(chain.scripts).join(', ')}`);
  });
  
  // Get available scripts
  console.log('Available script files:', scriptManager.getAvailableScripts());
  
  // Generate common labels
  const labels = TemplateHelpers.commonLabels(config);
  console.log('Common labels:', labels);
  
  return {
    config,
    processedChains,
    labels,
    availableChains: defaultsManager.getAvailableChainTypes(),
    availableScripts: scriptManager.getAvailableScripts(),
  };
}

// Run example if this file is executed directly
if (require.main === module) {
  try {
    const result = exampleUsage();
    console.log('\nExample completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Example failed:', error);
  }
} 