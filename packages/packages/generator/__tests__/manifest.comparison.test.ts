import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

import { BuilderManager } from '../src/builders';
import { GeneratorConfig } from '../src/types';
import { loadConfig } from './test-utils/load';
import { ManifestComparator, type ManifestComparison, type NormalizedResource, type ComparisonRules } from './test-utils/manifestComparison';

describe('Manifest Comparison Tests', () => {
  const configsDir = join(__dirname, '../../../__fixtures__/configs');
  const expectedManifestsDir = join(__dirname, '../../../__fixtures__/config-manifests');
  const testOutputDir = join(__dirname, '__output__', 'manifest-comparison');
  const comparator = new ManifestComparator();

  // Define config-specific comparison rules
  const configRules: Record<string, ComparisonRules> = {
    'eth': {
      ignoreResources: [
        'ConfigMap/*/keys',
        'ConfigMap/*/setup-scripts',
        'ConfigMap/*/setup-scripts-*'
      ],
      allowExtraResources: [
        'Service/*/*' // Allow extra services that weren't in original manifests (Kind/namespace/name)
      ]
    },
    'eth-lite': {
      ignoreResources: [
        'ConfigMap/*/keys',
        'ConfigMap/*/setup-scripts',
        'ConfigMap/*/setup-scripts-*'
      ],
      allowExtraResources: [
        'Service/*/*' // Allow extra services that weren't in original manifests (Kind/namespace/name)
      ]
    }
  };

  // Get all config files that have corresponding expected manifests
  const getConfigsWithExpectedManifests = (): string[] => {
    const configFiles = readdirSync(configsDir)
      .filter((file: string) => file.endsWith('.yaml'))
      .map((file: string) => file.replace('.yaml', ''));

    return configFiles.filter((configName: string) => {
      const expectedManifestFile = join(expectedManifestsDir, `${configName}.yaml`);
      return existsSync(expectedManifestFile);
    });
  };

  const configsWithExpectedManifests = getConfigsWithExpectedManifests();

  describe('Individual Config Comparisons', () => {
    configsWithExpectedManifests.forEach(configName => {
      describe(`Config: ${configName}`, () => {
        let comparison: ManifestComparison;
        let generatedManifests: NormalizedResource[];
        let expectedManifests: NormalizedResource[];

        beforeAll(() => {
          // Generate manifests
          const configPath = join(configsDir, `${configName}.yaml`);
          const config = loadConfig(configPath, configsDir);
          const outputDir = join(testOutputDir, configName);
          
          const manager = new BuilderManager(config);
          manager.build(outputDir);

          // Parse manifests for comparison
          generatedManifests = comparator.parseGeneratedManifests(outputDir);
          
          const expectedManifestFile = join(expectedManifestsDir, `${configName}.yaml`);
          expectedManifests = comparator.parseExpectedManifests(expectedManifestFile);

          // Get comparison rules for this config
          const rules = configRules[configName];

          // Perform comparison
          comparison = comparator.compareManifests(generatedManifests, expectedManifests, rules);
          comparison.configName = configName;
        });

        it('should generate manifests matching the reference', () => {
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
              comparison.modifiedResources.slice(0, 3).forEach(resource => { // Limit to first 3 to avoid overwhelming output
                errorMessage += `  ~ ${resource.kind}/${resource.name}\n`;
                errorMessage += `    ${resource.differences}\n\n`;
              });
              
              if (comparison.modifiedResources.length > 3) {
                errorMessage += `    ... and ${comparison.modifiedResources.length - 3} more modified resources\n`;
              }
            }

            throw new Error(errorMessage);
          }

          expect(comparison.hasMismatches).toBe(false);
        });

        it('should have correct resource count', () => {
          expect(generatedManifests.length).toBeGreaterThan(0);
          expect(expectedManifests.length).toBeGreaterThan(0);
          
          // Allow some flexibility in resource count due to potential differences in generation logic
          const countDifference = Math.abs(generatedManifests.length - expectedManifests.length);
          expect(countDifference).toBeLessThanOrEqual(2); // Allow up to 2 resource difference
        });

        it('should generate all critical resource types', () => {
          const generatedKinds = new Set(generatedManifests.map(r => r.kind));
          const expectedKinds = new Set(expectedManifests.map(r => r.kind));

          // Critical resource types that must be present
          const criticalKinds = ['StatefulSet', 'Service', 'ConfigMap'];
          
          criticalKinds.forEach(kind => {
            if (expectedKinds.has(kind)) {
              expect(generatedKinds).toContain(kind);
            }
          });
        });
      });
    });
  });

  describe('Cross-Config Analysis', () => {
    let allComparisons: ManifestComparison[] = [];

    beforeAll(() => {
      // Generate comparisons for all configs
      configsWithExpectedManifests.forEach(configName => {
        const configPath = join(configsDir, `${configName}.yaml`);
        const config = loadConfig(configPath, configsDir);
        const outputDir = join(testOutputDir, configName);
        
        const manager = new BuilderManager(config);
        manager.build(outputDir);

        const generatedManifests = comparator.parseGeneratedManifests(outputDir);
        const expectedManifestFile = join(expectedManifestsDir, `${configName}.yaml`);
        const expectedManifests = comparator.parseExpectedManifests(expectedManifestFile);

        // Get comparison rules for this config
        const rules = configRules[configName];

        const comparison = comparator.compareManifests(generatedManifests, expectedManifests, rules);
        comparison.configName = configName;
        allComparisons.push(comparison);
      });
    });

    it('should have high overall compatibility rate', () => {
      const totalConfigs = allComparisons.length;
      const matchingConfigs = allComparisons.filter(c => !c.hasMismatches).length;
      const compatibilityRate = matchingConfigs / totalConfigs;

      console.log(`\nManifest Compatibility Report:`);
      console.log(`  Total configs tested: ${totalConfigs}`);
      console.log(`  Perfect matches: ${matchingConfigs}`);
      console.log(`  Compatibility rate: ${(compatibilityRate * 100).toFixed(1)}%`);

      // List configs with rules applied
      const configsWithRules = Object.keys(configRules);
      if (configsWithRules.length > 0) {
        console.log(`  Configs with special rules: ${configsWithRules.join(', ')}`);
      }

      // Expect at least 70% compatibility (adjust threshold as needed)
      expect(compatibilityRate).toBeGreaterThanOrEqual(0.7);
    });

    it('should provide summary of common differences', () => {
      const commonIssues = {
        missingResources: new Map<string, number>(),
        extraResources: new Map<string, number>(),
        modifiedResourceTypes: new Map<string, number>()
      };

      allComparisons.forEach(comparison => {
        comparison.missingResources.forEach(resource => {
          const kind = resource.split('/')[0];
          commonIssues.missingResources.set(kind, (commonIssues.missingResources.get(kind) || 0) + 1);
        });

        comparison.extraResources.forEach(resource => {
          const kind = resource.split('/')[0];
          commonIssues.extraResources.set(kind, (commonIssues.extraResources.get(kind) || 0) + 1);
        });

        comparison.modifiedResources.forEach(resource => {
          commonIssues.modifiedResourceTypes.set(resource.kind, (commonIssues.modifiedResourceTypes.get(resource.kind) || 0) + 1);
        });
      });

      // Log summary for debugging
      console.log(`\nCommon Issues Summary:`);
      if (commonIssues.missingResources.size > 0) {
        console.log(`  Most common missing resource types:`, Array.from(commonIssues.missingResources.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5));
      }
      if (commonIssues.extraResources.size > 0) {
        console.log(`  Most common extra resource types:`, Array.from(commonIssues.extraResources.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5));
      }
      if (commonIssues.modifiedResourceTypes.size > 0) {
        console.log(`  Most commonly modified resource types:`, Array.from(commonIssues.modifiedResourceTypes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5));
      }

      // This test always passes but provides valuable debugging information
      expect(true).toBe(true);
    });
  });
}); 