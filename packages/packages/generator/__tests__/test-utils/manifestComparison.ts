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

export interface ComparisonRules {
  ignoreResources?: string[]; // Resource patterns to ignore (e.g., "ConfigMap/keys", "Service/*")
  allowExtraResources?: string[]; // Extra resource patterns to allow (e.g., "Service/*")
  ignoreMissingResources?: string[]; // Missing resource patterns to ignore
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
      normalized.spec = this.deepNormalize({ ...resource.spec });
    }
    if (resource.data) {
      normalized.data = this.normalizeDataFields({ ...resource.data });
    }

    // Remove fields that are expected to vary or are not semantically important
    this.removeVolatileFields(normalized);

    return normalized;
  }

  /**
   * Deep normalize an object, handling arrays, strings, and nested objects
   */
  private deepNormalize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return this.normalizeArray(obj);
    }

    if (typeof obj === 'string') {
      return this.normalizeString(obj);
    }

    if (typeof obj === 'object') {
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = this.deepNormalize(value);
      }
      return normalized;
    }

    return obj;
  }

  /**
   * Normalize arrays by sorting them when possible
   */
  private normalizeArray(arr: any[]): any[] {
    const normalized = arr.map(item => this.deepNormalize(item));
    
    // Try to sort arrays that contain objects with name or key fields
    try {
      if (normalized.length > 0 && typeof normalized[0] === 'object' && normalized[0] !== null) {
        const firstItem = normalized[0];
        
        // Sort by name field if it exists
        if ('name' in firstItem) {
          return normalized.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }
        
        // Sort by key field if it exists
        if ('key' in firstItem) {
          return normalized.sort((a, b) => String(a.key).localeCompare(String(b.key)));
        }
        
        // For ports, sort by port number or name
        if ('port' in firstItem) {
          return normalized.sort((a, b) => {
            const aPort = typeof a.port === 'number' ? a.port : (a.name || '');
            const bPort = typeof b.port === 'number' ? b.port : (b.name || '');
            return String(aPort).localeCompare(String(bPort));
          });
        }
      }
    } catch (error) {
      // If sorting fails, return the normalized array as-is
    }
    
    return normalized;
  }

  /**
   * Normalize string content to ignore formatting differences
   */
  private normalizeString(str: string): string {
    // Handle JSON strings specially
    try {
      const parsed = JSON.parse(str);
      // Re-stringify with consistent formatting
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Not JSON, apply other normalizations
      return str
        .replace(/,\s*\n/g, '\n')  // Remove trailing commas before newlines
        .replace(/,\s*$/gm, '')    // Remove trailing commas at end of lines
        .trim();
    }
  }

  /**
   * Normalize data fields (like ConfigMap data) that often contain scripts or JSON
   */
  private normalizeDataFields(data: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        normalized[key] = this.normalizeString(value);
      } else {
        normalized[key] = this.deepNormalize(value);
      }
    }
    
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
  public compareManifests(
    generated: NormalizedResource[], 
    expected: NormalizedResource[], 
    rules?: ComparisonRules
  ): ManifestComparison {
    // Apply filtering rules if provided
    const filteredGenerated = this.applyResourceRules(generated, rules, 'generated');
    const filteredExpected = this.applyResourceRules(expected, rules, 'expected');

    const generatedMap = new Map<string, NormalizedResource>();
    const expectedMap = new Map<string, NormalizedResource>();

    // Index resources by their keys
    filteredGenerated.forEach(resource => {
      generatedMap.set(this.getResourceKey(resource), resource);
    });

    filteredExpected.forEach(resource => {
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
        // Check if this missing resource should be ignored
        if (!this.shouldIgnoreByRules(key, rules?.ignoreMissingResources)) {
          missingResources.push(key);
        }
      }
    }

    // Find extra resources (in generated but not in expected)
    for (const [key] of generatedMap) {
      if (!expectedMap.has(key)) {
        // Check if this extra resource is allowed
        if (!this.shouldIgnoreByRules(key, rules?.allowExtraResources)) {
          extraResources.push(key);
        }
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
   * Apply resource filtering rules to a list of resources
   */
  private applyResourceRules(
    resources: NormalizedResource[], 
    rules?: ComparisonRules, 
    context?: 'generated' | 'expected'
  ): NormalizedResource[] {
    if (!rules?.ignoreResources) {
      return resources;
    }

    return resources.filter(resource => {
      const resourceKey = this.getResourceKey(resource);
      return !this.shouldIgnoreByRules(resourceKey, rules.ignoreResources);
    });
  }

  /**
   * Check if a resource key matches any of the ignore patterns
   */
  private shouldIgnoreByRules(resourceKey: string, patterns?: string[]): boolean {
    if (!patterns) {
      return false;
    }

    return patterns.some(pattern => this.matchesPattern(resourceKey, pattern));
  }

  /**
   * Check if a resource key matches a pattern (supports wildcards)
   */
  private matchesPattern(resourceKey: string, pattern: string): boolean {
    // Convert pattern to regex
    // Support patterns like "ConfigMap/keys", "Service/*", "*/*"
    const regexPattern = pattern
      .replace(/\*/g, '[^/]*') // Replace * with regex for non-slash characters
      .replace(/\//g, '\\/');   // Escape slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(resourceKey);
  }

  /**
   * Compare two individual resources and return diff string if different
   */
  private compareResources(generated: NormalizedResource, expected: NormalizedResource): string | null {
    // Special handling for labels - allow extra labels in generated
    const generatedForComparison = { ...generated };
    const expectedForComparison = { ...expected };

    if (expected.metadata.labels && generated.metadata.labels) {
      // Check if all expected labels are present in generated
      const missingLabels: string[] = [];
      for (const [key, value] of Object.entries(expected.metadata.labels)) {
        if (generated.metadata.labels[key] !== value) {
          missingLabels.push(`${key}: ${value}`);
        }
      }
      
      if (missingLabels.length > 0) {
        return `Missing expected labels: ${missingLabels.join(', ')}`;
      }
      
      // For comparison, only include the expected labels in generated
      generatedForComparison.metadata = {
        ...generatedForComparison.metadata,
        labels: Object.fromEntries(
          Object.entries(expected.metadata.labels).map(([key, value]) => [
            key,
            generated.metadata.labels![key]
          ])
        )
      };
    }

    // Deep comparison using Jest's diff utility
    const differences = diff(expectedForComparison, generatedForComparison, {
      expand: false,
      contextLines: 3,
      aAnnotation: 'Expected (reference)',
      bAnnotation: 'Generated (actual)'
    });

    // If Jest's diff indicates no difference, return null
    if (differences && differences.includes('Compared values have no visual difference')) {
      return null;
    }

    // Filter out insignificant differences
    if (differences && this.isInsignificantDifference(differences)) {
      return null;
    }

    return differences || null;
  }

  /**
   * Check if a difference is insignificant (formatting only)
   */
  private isInsignificantDifference(diffString: string): boolean {
    // Split into lines and check if differences are only formatting
    const lines = diffString.split('\n');
    let hasSignificantDiff = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip metadata lines
      if (trimmedLine.startsWith('@@') || 
          trimmedLine.includes('Expected (reference)') || 
          trimmedLine.includes('Generated (actual)')) {
        continue;
      }
      
      // Check for significant differences
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('+')) {
        const content = trimmedLine.substring(1).trim();
        
        // Skip empty lines
        if (content === '') continue;
        
        // Skip lines that are just quotes or commas
        if (content === '",' || content === '"' || content === ',') {
          continue;
        }
        
        // Skip lines that only differ by trailing commas or quotes
        const withoutTrailing = content.replace(/[",]*$/, '');
        if (withoutTrailing === '') continue;
        
        // If we get here, it's a significant difference
        hasSignificantDiff = true;
        break;
      }
    }
    
    return !hasSignificantDiff;
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
