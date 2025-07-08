import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { diff } from 'jest-diff';

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

export class ManifestComparator {
  /**
   * Parse a YAML file containing multiple documents separated by ---
   */
  private parseManifestFile(content: string): NormalizedResource[] {
    const documents = content.split(/^---$/m)
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0);
    
    return documents
      .map(doc => {
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
      })
      .filter((resource): resource is NormalizedResource => resource !== null);
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
    for (const [key] of expectedMap) {
      if (!generatedMap.has(key)) {
        missingResources.push(key);
      }
    }

    // Find extra resources (in generated but not in expected)
    for (const [key] of generatedMap) {
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
      const files: string[] = [];
      
      const items = readdirSync(dir, { withFileTypes: true });
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

export type { ManifestComparison, NormalizedResource };
