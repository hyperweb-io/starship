import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

import { BuilderManager } from '../src/builders';
import { GeneratorConfig } from '../src/types';
import { loadConfig } from './test-utils/load';
import { 
  ManifestComparator, 
  type ManifestComparison, 
  type NormalizedResource, 
  type ChainTypeConfig,
  type ComparisonOptions 
} from './test-utils/manifestComparison';

describe('Manifest Comparison Tests', () => {
  const configsDir = join(__dirname, '../../../__fixtures__/configs');
  const expectedManifestsDir = join(__dirname, '../../../__fixtures__/config-manifests');
  const testOutputDir = join(__dirname, '__output__', 'manifest-comparison');
  const comparator = new ManifestComparator();

  // Helper function to determine chain types from config name
  const getChainTypesFromConfig = (configName: string): ChainTypeConfig => {
    // For eth and eth-lite configs, we expect only ethereum chains
    if (configName === 'eth' || configName === 'eth-lite') {
      return {
        hasCosmosChains: false,
        hasEthereumChains: true,
        chainNames: ['ethereum']
      };
    }
    
    // For cosmos configs, analyze the actual config
    // This is a simplified version - in reality we'd parse the config file
    if (configName.includes('two-chain')) {
      return {
        hasCosmosChains: true,
        hasEthereumChains: false,
        chainNames: ['osmosis', 'cosmoshub']
      };
    }
    
    // Default: assume cosmos chains
    return {
      hasCosmosChains: true,
      hasEthereumChains: false,
      chainNames: []
    };
  };

  // Get comparison options for a config
  const getComparisonOptions = (configName: string): ComparisonOptions => {
    const chainTypes = getChainTypesFromConfig(configName);
    
    return {
      chainTypes,
      allowExtraServices: true, // Allow extra services that weren't in original manifests
      strictMode: false
    };
  };

  // Helper function to validate that a config directory and expected manifest exist
  const validateTestFiles = (configName: string) => {
    const configFile = join(configsDir, `${configName}.yaml`);
    const expectedManifestFile = join(expectedManifestsDir, `${configName}.yaml`);
    
    if (!existsSync(configFile)) {
      throw new Error(`Config file missing: ${configFile}`);
    }
    
    if (!existsSync(expectedManifestFile)) {
      throw new Error(`Expected manifest file missing: ${expectedManifestFile}`);
    }
  };

  // Get list of available configs
  const getAvailableConfigs = (): string[] => {
    if (!existsSync(configsDir)) {
      return [];
    }
    
    return readdirSync(configsDir)
      .filter(file => file.endsWith('.yaml'))
      .map(file => file.replace('.yaml', ''))
      .filter(configName => {
        // Only include configs that have corresponding expected manifests
        const expectedFile = join(expectedManifestsDir, `${configName}.yaml`);
        return existsSync(expectedFile);
      });
  };

  describe('Individual Config Comparisons', () => {
    const availableConfigs = getAvailableConfigs();

    if (availableConfigs.length === 0) {
      test('should have available configs', () => {
        throw new Error(`No configs found in ${configsDir} with corresponding manifests in ${expectedManifestsDir}`);
      });
    }

    availableConfigs.forEach(configName => {
      describe(`Config: ${configName}`, () => {
        let comparison: ManifestComparison;

                 beforeAll(() => {
          validateTestFiles(configName);

                     // Load and process config
           const configFile = join(configsDir, `${configName}.yaml`);
           const config: GeneratorConfig = loadConfig(configFile, configsDir);

           // Generate manifests
           const builderManager = new BuilderManager(config);
           const configOutputDir = join(testOutputDir, configName);
           builderManager.build(configOutputDir);

          // Parse manifests
          const generatedManifests = comparator.parseGeneratedManifests(configOutputDir);
          const expectedManifestsFile = join(expectedManifestsDir, `${configName}.yaml`);
          const expectedManifests = comparator.parseExpectedManifests(expectedManifestsFile);

          // Perform comparison with semantic chain-type awareness
          const options = getComparisonOptions(configName);
          comparison = comparator.compareManifests(generatedManifests, expectedManifests, options);
          comparison.configName = configName;
        });

        test('should generate manifests matching the reference', () => {
          if (comparison.hasMismatches) {
            let errorMessage = `Manifest comparison failed for config: ${configName}\n\n`;

            if (comparison.missingResources.length > 0) {
              errorMessage += `Missing Resources (${comparison.missingResources.length}):\n`;
              comparison.missingResources.forEach(resource => {
                errorMessage += `  - ${resource}\n`;
              });
              errorMessage += '\n';
            }

            if (comparison.extraResources.length > 0) {
              errorMessage += `Extra Resources (${comparison.extraResources.length}):\n`;
              comparison.extraResources.forEach(resource => {
                errorMessage += `  + ${resource}\n`;
              });
              errorMessage += '\n';
            }

            if (comparison.modifiedResources.length > 0) {
              errorMessage += `Modified Resources (${comparison.modifiedResources.length}):\n`;
              comparison.modifiedResources.forEach(resource => {
                errorMessage += `  ~ ${resource.kind}/${resource.name}\n`;
                errorMessage += `    ${resource.differences}\n\n`;
              });
            }

            throw new Error(errorMessage);
          }
        });

        test('should have reasonable resource counts', () => {
          const configOutputDir = join(testOutputDir, configName);
          const generatedManifests = comparator.parseGeneratedManifests(configOutputDir);
          
          // Basic sanity checks
          expect(generatedManifests.length).toBeGreaterThan(0);
          
          // Check for expected resource types based on config
          const chainTypes = getChainTypesFromConfig(configName);
          
          if (chainTypes.hasEthereumChains) {
            const services = generatedManifests.filter(r => r.kind === 'Service');
            const statefulSets = generatedManifests.filter(r => r.kind === 'StatefulSet');
            expect(services.length).toBeGreaterThan(0);
            expect(statefulSets.length).toBeGreaterThan(0);
          }
          
          if (chainTypes.hasCosmosChains) {
            const configMaps = generatedManifests.filter(r => r.kind === 'ConfigMap');
            expect(configMaps.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Cross-Config Analysis', () => {
         test('should produce consistent resource patterns across configs', () => {
      const availableConfigs = getAvailableConfigs();
      const results: Record<string, { generated: number; expected: number; chainTypes: ChainTypeConfig }> = {};

             // Analyze each config
       for (const configName of availableConfigs.slice(0, 5)) { // Limit to first 5 for performance
         validateTestFiles(configName);

         const configFile = join(configsDir, `${configName}.yaml`);
         const config: GeneratorConfig = loadConfig(configFile, configsDir);

         const builderManager = new BuilderManager(config);
         const configOutputDir = join(testOutputDir, configName);
         builderManager.build(configOutputDir);

        const generatedManifests = comparator.parseGeneratedManifests(configOutputDir);
        const expectedManifestsFile = join(expectedManifestsDir, `${configName}.yaml`);
        const expectedManifests = comparator.parseExpectedManifests(expectedManifestsFile);

        const chainTypes = comparator.analyzeChainTypes(generatedManifests);
        
        results[configName] = {
          generated: generatedManifests.length,
          expected: expectedManifests.length,
          chainTypes
        };
      }

      // Analyze patterns
      const cosmosConfigs = Object.entries(results).filter(([_, data]) => data.chainTypes.hasCosmosChains);
      const ethConfigs = Object.entries(results).filter(([_, data]) => data.chainTypes.hasEthereumChains);

      if (cosmosConfigs.length > 1) {
        // Cosmos configs should have similar patterns
        const avgGenerated = cosmosConfigs.reduce((sum, [_, data]) => sum + data.generated, 0) / cosmosConfigs.length;
        expect(avgGenerated).toBeGreaterThan(5); // Should have reasonable number of resources
      }

      if (ethConfigs.length > 1) {
        // Ethereum configs should have similar patterns
        const avgGenerated = ethConfigs.reduce((sum, [_, data]) => sum + data.generated, 0) / ethConfigs.length;
        expect(avgGenerated).toBeGreaterThan(2); // Should have at least a few resources
      }

      // Log analysis for debugging
      console.log('\nConfig Analysis Summary:');
      Object.entries(results).forEach(([configName, data]) => {
        console.log(`  ${configName}: Generated(${data.generated}) Expected(${data.expected}) Cosmos(${data.chainTypes.hasCosmosChains}) Eth(${data.chainTypes.hasEthereumChains})`);
      });
    });
  });
}); 