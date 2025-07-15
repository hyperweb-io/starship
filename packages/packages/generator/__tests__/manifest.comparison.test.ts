import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

import { BuilderManager } from '../src/builders';
import { GeneratorConfig } from '../src/types';
import { loadConfig } from './test-utils/load';
import {
  type ChainTypeConfig,
  type ComparisonOptions,
  ManifestComparator,
  type ManifestComparison
} from './test-utils/manifestComparison';

describe('Manifest Comparison Tests', () => {
  const configsDir = join(__dirname, '../../../__fixtures__/configs');
  const expectedManifestsDir = join(
    __dirname,
    '../../../__fixtures__/config-manifests'
  );
  const testOutputDir = join(__dirname, '__output__', 'manifest-comparison');
  const comparator = new ManifestComparator();

  // Helper function to determine chain types from config name
  const getChainTypesFromConfig = (configName: string): ChainTypeConfig => {
    // Load the actual config to analyze chain types
    const configFile = join(configsDir, `${configName}.yaml`);
    const config: GeneratorConfig = loadConfig(configFile, configsDir);
    
    const chainNames = config.chains?.map(chain => chain.name) || [];
    const hasEthereumChains = config.chains?.some(chain => chain.name === 'ethereum') || false;
    const hasCosmosChains = config.chains?.some(chain => chain.name !== 'ethereum') || false;
    
    return {
      hasCosmosChains,
      hasEthereumChains,
      chainNames
    };
  };

  // Get comparison options for a config
  const getComparisonOptions = (configName: string): ComparisonOptions => {
    const chainTypes = getChainTypesFromConfig(configName);

    return {
      chainTypes,
      allowExtraServices: true, // Allow extra services that weren't in original manifests
    };
  };

  // Generate and format a summary diff for snapshot comparison
  const generateSummaryForSnapshot = (comparison: ManifestComparison): string => {
    let summary = '';

    if (!comparison.hasMismatches) {
      return '✅ All resources match perfectly!';
    }
    
    if (comparison.missingResources.length > 0) {
      summary += `❌ MISSING_RESOURCES:\n${comparison.missingResources.join('\n')}\n\n`;
    }

    if (comparison.extraResources.length > 0) {
      summary += `➕ EXTRA_RESOURCES:\n${comparison.extraResources.join('\n')}\n\n`;
    }

    if (comparison.modifiedResources.length > 0) {
      summary += `🔄 MODIFIED_RESOURCES:\n`;
      comparison.modifiedResources.forEach(resource => {
        summary += `\n--- ${resource.kind}/${resource.name} ---\n`;
        summary += `${resource.differences}\n`;
      });
    }

    return summary.trim();
  };

  // Helper function to validate that a config directory and expected manifest exist
  const validateTestFiles = (configName: string) => {
    const configFile = join(configsDir, `${configName}.yaml`);
    const expectedManifestFile = join(
      expectedManifestsDir,
      `${configName}.yaml`
    );

    if (!existsSync(configFile)) {
      throw new Error(`Config file missing: ${configFile}`);
    }

    if (!existsSync(expectedManifestFile)) {
      throw new Error(
        `Expected manifest file missing: ${expectedManifestFile}`
      );
    }
  };

  // Get list of available configs
  const getAvailableConfigs = (): string[] => {
    if (!existsSync(configsDir)) {
      return [];
    }

    return readdirSync(configsDir)
      .filter((file) => file.endsWith('.yaml'))
      .map((file) => file.replace('.yaml', ''))
      .filter((configName) => {
        // Only include configs that have corresponding expected manifests
        const expectedFile = join(expectedManifestsDir, `${configName}.yaml`);
        return existsSync(expectedFile);
      });
  };

  describe('Individual Config Comparisons', () => {
    const availableConfigs = getAvailableConfigs();

    if (availableConfigs.length === 0) {
      test('should have available configs', () => {
        throw new Error(
          `No configs found in ${configsDir} with corresponding manifests in ${expectedManifestsDir}`
        );
      });
    }

    availableConfigs.forEach((configName) => {
      it(`should generate manifests for ${configName} that match the snapshot`, () => {
        validateTestFiles(configName);

        // Load and process config
        const configFile = join(configsDir, `${configName}.yaml`);
        const config: GeneratorConfig = loadConfig(configFile, configsDir);

        // Generate manifests
        const builderManager = new BuilderManager(config);
        const configOutputDir = join(testOutputDir, configName);
        builderManager.build(configOutputDir);

        // Parse manifests
        const generatedManifests =
          comparator.parseGeneratedManifests(configOutputDir);
        const expectedManifestsFile = join(
          expectedManifestsDir,
          `${configName}.yaml`
        );
        const expectedManifests = comparator.parseExpectedManifests(
          expectedManifestsFile
        );

        // Perform comparison
        const options = getComparisonOptions(configName);
        const comparison = comparator.compareManifests(
          generatedManifests,
          expectedManifests,
          options
        );
        comparison.configName = configName;

        // Generate a summary and compare with snapshot
        const summary = generateSummaryForSnapshot(comparison);
        expect(summary).toMatchSnapshot();
      });
    });
  });
});
