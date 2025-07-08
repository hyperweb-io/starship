import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { diff } from 'jest-diff';

import { BuilderManager } from '../src/builders';
import { GeneratorConfig } from '../src/types';
import { loadConfig } from './test-utils/load';

interface ManifestComparison {
  configName: string;
  hasMismatches: boolean;
  missingResources: string[];
  extraResources: string[];
  modifiedResources: Array<{
    kind: string;
    name: string;
    namespace?: string;
    differences: string;
  }>;
}

interface NormalizedResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: any;
  data?: any;
}

class ManifestComparator {
  /**
   * Parse a YAML file containing multiple documents separated by ---
   */
  private parseManifestFile(content: string): NormalizedResource[] {
    const documents = content.split(/^---$/m)
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0);
    
    return documents.map(doc => {
      try {
        // Remove leading comments to find the actual YAML content
        const yamlContent = doc.replace(/^#.*$/gm, '').trim();
        if (yamlContent.length === 0) {
          return null;
        }
        
        const parsed = yaml.load(yamlContent) as any;
        return this.normalizeResource(parsed);
      } catch (error) {
        throw new Error(`Failed to parse YAML document: ${error}`);
      }
    }).filter(resource => resource !== null);
  }

  /**
   * Normalize a resource for comparison by removing/standardizing certain fields
   */
  private normalizeResource(resource: any): NormalizedResource | null {
    if (!resource || !resource.kind || !resource.metadata?.name) {
      return null;
    }

    // Create a normalized copy
    const normalized: NormalizedResource = {
      apiVersion: resource.apiVersion,
      kind: resource.kind,
      metadata: {
        name: resource.metadata.name,
        ...(resource.metadata.namespace && { namespace: resource.metadata.namespace }),
        ...(resource.metadata.labels && { labels: { ...resource.metadata.labels } }),
        ...(resource.metadata.annotations && { annotations: { ...resource.metadata.annotations } })
      }
    };

    // Include spec and data if present
    if (resource.spec) {
      normalized.spec = { ...resource.spec };
    }
    if (resource.data) {
      normalized.data = { ...resource.data };
    }

    // Remove fields that are expected to vary or are not semantically important
    this.removeVolatileFields(normalized);

    return normalized;
  }

  /**
   * Remove fields that are expected to change or are not semantically important
   */
  private removeVolatileFields(resource: NormalizedResource): void {
    // Remove metadata fields that may vary
    if (resource.metadata.annotations) {
      // Remove Helm-specific annotations that won't be in generated manifests
      delete resource.metadata.annotations['meta.helm.sh/release-name'];
      delete resource.metadata.annotations['meta.helm.sh/release-namespace'];
      
      // Remove empty annotations object
      if (Object.keys(resource.metadata.annotations).length === 0) {
        delete resource.metadata.annotations;
      }
    }

    // Remove or normalize fields in spec that are expected to vary
    if (resource.spec) {
      // For StatefulSets, normalize certain fields
      if (resource.kind === 'StatefulSet') {
        // Remove updateStrategy if it's default
        if (resource.spec.updateStrategy?.type === 'RollingUpdate') {
          delete resource.spec.updateStrategy;
        }
      }

      // For Services, normalize ports if needed
      if (resource.kind === 'Service' && resource.spec.ports) {
        resource.spec.ports = resource.spec.ports.map((port: any) => ({
          ...port,
          // Ensure consistent ordering of port fields
        }));
      }
    }
  }

  /**
   * Create a unique key for a resource for comparison
   */
  private getResourceKey(resource: NormalizedResource): string {
    const namespace = resource.metadata.namespace || 'default';
    return `${resource.kind}/${namespace}/${resource.metadata.name}`;
  }

  /**
   * Compare two sets of resources and return detailed differences
   */
  public compareManifests(generated: NormalizedResource[], expected: NormalizedResource[]): ManifestComparison {
    const generatedMap = new Map<string, NormalizedResource>();
    const expectedMap = new Map<string, NormalizedResource>();

    // Index resources by their keys
    generated.forEach(resource => {
      generatedMap.set(this.getResourceKey(resource), resource);
    });

    expected.forEach(resource => {
      expectedMap.set(this.getResourceKey(resource), resource);
    });

    const missingResources: string[] = [];
    const extraResources: string[] = [];
    const modifiedResources: Array<{
      kind: string;
      name: string;
      namespace?: string;
      differences: string;
    }> = [];

    // Find missing resources (in expected but not in generated)
    for (const [key, resource] of expectedMap) {
      if (!generatedMap.has(key)) {
        missingResources.push(key);
      }
    }

    // Find extra resources (in generated but not in expected)
    for (const [key, resource] of generatedMap) {
      if (!expectedMap.has(key)) {
        extraResources.push(key);
      }
    }

    // Compare matching resources
    for (const [key, generatedResource] of generatedMap) {
      const expectedResource = expectedMap.get(key);
      if (expectedResource) {
        const differences = this.compareResources(generatedResource, expectedResource);
        if (differences) {
          modifiedResources.push({
            kind: generatedResource.kind,
            name: generatedResource.metadata.name,
            namespace: generatedResource.metadata.namespace,
            differences
          });
        }
      }
    }

    return {
      configName: '', // Will be set by caller
      hasMismatches: missingResources.length > 0 || extraResources.length > 0 || modifiedResources.length > 0,
      missingResources,
      extraResources,
      modifiedResources
    };
  }

  /**
   * Compare two individual resources and return diff string if different
   */
  private compareResources(generated: NormalizedResource, expected: NormalizedResource): string | null {
    // Deep comparison using Jest's diff utility
    const differences = diff(expected, generated, {
      expand: false,
      contextLines: 3,
      aAnnotation: 'Expected (reference)',
      bAnnotation: 'Generated (actual)'
    });

    // If Jest's diff indicates no difference, return null
    if (differences && differences.includes('Compared values have no visual difference')) {
      return null;
    }

    return differences || null;
  }

  /**
   * Parse generated manifests from the test output directory
   */
  public parseGeneratedManifests(outputDir: string): NormalizedResource[] {
    const manifests: NormalizedResource[] = [];
    
    if (!existsSync(outputDir)) {
      throw new Error(`Output directory does not exist: ${outputDir}`);
    }

    // Recursively find all YAML files
    const findYamlFiles = (dir: string): string[] => {
      const fs = require('fs');
      const files: string[] = [];
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...findYamlFiles(fullPath));
        } else if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const yamlFiles = findYamlFiles(outputDir);
    
    for (const file of yamlFiles) {
      const content = readFileSync(file, 'utf-8');
      const resources = this.parseManifestFile(content);
      manifests.push(...resources);
    }

    return manifests;
  }

  /**
   * Parse expected manifests from a single reference file
   */
  public parseExpectedManifests(manifestFile: string): NormalizedResource[] {
    if (!existsSync(manifestFile)) {
      throw new Error(`Expected manifest file does not exist: ${manifestFile}`);
    }

    const content = readFileSync(manifestFile, 'utf-8');
    return this.parseManifestFile(content);
  }
}

describe('Manifest Comparison Tests', () => {
  const configsDir = join(__dirname, '../../../__fixtures__/configs');
  const expectedManifestsDir = join(__dirname, '../../../__fixtures__/config-manifests');
  const testOutputDir = join(__dirname, '__output__', 'manifest-comparison');
  const comparator = new ManifestComparator();

  // Get all config files that have corresponding expected manifests
  const getConfigsWithExpectedManifests = (): string[] => {
    const configFiles = require('fs').readdirSync(configsDir)
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
        let generatedManifests: any[];
        let expectedManifests: any[];

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

          // Perform comparison
          comparison = comparator.compareManifests(generatedManifests, expectedManifests);
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

        const comparison = comparator.compareManifests(generatedManifests, expectedManifests);
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