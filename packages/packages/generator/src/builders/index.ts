import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

import { applyDefaults } from '../defaults';
import { GeneratorConfig, Manifest } from '../types';
import { ChainBuilder } from './chains';
import { ExplorerBuilder } from './explorer';
import { FrontendBuilder } from './frontend';
import { IngressBuilder } from './ingress';
import { MonitoringBuilder } from './monitoring';
import { RegistryBuilder } from './registry';
import { RelayerBuilder } from './relayers';

import { IntOrString } from 'kubernetesjs';

export class BuilderManager {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig) {
    this.config = applyDefaults(config);
  }

  getConfig(): GeneratorConfig {
    return this.config;
  }

  /**
   * IntOrString field definitions with explicit paths
   * '*' represents array indices (e.g., containers[0], ports[1])
   */
  private readonly INT_OR_STRING_FIELDS = [
    // Service ports
    { path: ['spec', 'ports', '*', 'targetPort'], description: 'Service targetPort' },
    
    // Container probes - direct containers
    { path: ['spec', 'containers', '*', 'livenessProbe', 'httpGet', 'port'], description: 'Container liveness HTTP probe port' },
    { path: ['spec', 'containers', '*', 'readinessProbe', 'httpGet', 'port'], description: 'Container readiness HTTP probe port' },
    { path: ['spec', 'containers', '*', 'startupProbe', 'httpGet', 'port'], description: 'Container startup HTTP probe port' },
    { path: ['spec', 'containers', '*', 'livenessProbe', 'tcpSocket', 'port'], description: 'Container liveness TCP probe port' },
    { path: ['spec', 'containers', '*', 'readinessProbe', 'tcpSocket', 'port'], description: 'Container readiness TCP probe port' },
    { path: ['spec', 'containers', '*', 'startupProbe', 'tcpSocket', 'port'], description: 'Container startup TCP probe port' },
    
    // Pod template containers (Deployment/StatefulSet/etc)
    { path: ['spec', 'template', 'spec', 'containers', '*', 'livenessProbe', 'httpGet', 'port'], description: 'Pod template liveness HTTP probe port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'readinessProbe', 'httpGet', 'port'], description: 'Pod template readiness HTTP probe port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'startupProbe', 'httpGet', 'port'], description: 'Pod template startup HTTP probe port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'livenessProbe', 'tcpSocket', 'port'], description: 'Pod template liveness TCP probe port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'readinessProbe', 'tcpSocket', 'port'], description: 'Pod template readiness TCP probe port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'startupProbe', 'tcpSocket', 'port'], description: 'Pod template startup TCP probe port' },
    
    // Container ports
    { path: ['spec', 'containers', '*', 'ports', '*', 'containerPort'], description: 'Container port' },
    { path: ['spec', 'template', 'spec', 'containers', '*', 'ports', '*', 'containerPort'], description: 'Pod template container port' },
    
    // Rolling update strategies
    { path: ['spec', 'strategy', 'rollingUpdate', 'maxSurge'], description: 'Deployment rolling update maxSurge' },
    { path: ['spec', 'strategy', 'rollingUpdate', 'maxUnavailable'], description: 'Deployment rolling update maxUnavailable' },
    { path: ['spec', 'updateStrategy', 'rollingUpdate', 'maxSurge'], description: 'StatefulSet rolling update maxSurge' },
    { path: ['spec', 'updateStrategy', 'rollingUpdate', 'maxUnavailable'], description: 'StatefulSet rolling update maxUnavailable' },
    
    // Pod disruption budgets
    { path: ['spec', 'maxUnavailable'], description: 'PodDisruptionBudget maxUnavailable' },
    { path: ['spec', 'minAvailable'], description: 'PodDisruptionBudget minAvailable' },
  ];

  /**
   * Check if a string value represents a numeric value
   */
  private isNumericString(value: string): boolean {
    const numericValue = Number(value);
    return !isNaN(numericValue) && isFinite(numericValue) && value.trim() === String(numericValue);
  }

  /**
   * Check if a field path matches any of the known IntOrString patterns
   */
  private isIntOrStringField(currentPath: string[]): boolean {
    return this.INT_OR_STRING_FIELDS.some(pattern => 
      this.pathMatches(currentPath, pattern.path)
    );
  }

  /**
   * Check if a path matches a pattern (with '*' as wildcard for array indices)
   */
  private pathMatches(actualPath: string[], patternPath: string[]): boolean {
    if (actualPath.length !== patternPath.length) {
      return false;
    }
    
    for (let i = 0; i < patternPath.length; i++) {
      const pattern = patternPath[i];
      const actual = actualPath[i];
      
      // '*' matches any array index (numeric string)
      if (pattern === '*') {
        if (isNaN(Number(actual))) {
          return false; // Expected array index, got non-numeric
        }
        continue;
      }
      
      // Exact match required for non-wildcard segments
      if (pattern !== actual) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Recursively normalize IntOrString fields throughout a manifest
   * Convert numeric strings to numbers, keep named references as strings
   */
  private normalizeIntOrStringFields(obj: any, path: string[] = []): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.normalizeIntOrStringFields(item, [...path, String(index)])
      );
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (typeof value === 'string' && this.isIntOrStringField(currentPath)) {
        // This is a known IntOrString field with a string value
        if (this.isNumericString(value)) {
          // Convert numeric strings to numbers
          result[key] = Number(value);
        } else {
          // Keep named references as strings (e.g., "http", "https")
          result[key] = value;
        }
      } else {
        // Recursively process nested objects/arrays
        result[key] = this.normalizeIntOrStringFields(value, currentPath);
      }
    }
    return result;
  }

  private getManifestOutputPath(manifest: Manifest, baseDir: string): string {
    const labels = manifest.metadata?.labels || {};
    const component = labels['app.kubernetes.io/component'];
    const partOf = labels['app.kubernetes.io/part-of'];
    const role = labels['app.kubernetes.io/role'];
    const kind = manifest.kind.toLowerCase();
    const name = manifest.metadata.name;

    if (component === 'chain') {
      // Chain-specific resources: outputs/<chain-name>/<role>-<kind>.yaml
      // For StatefulSets, use the special chain-name label, otherwise use app.kubernetes.io/name
      const chainName =
        labels['starship.io/chain-name'] || labels['app.kubernetes.io/name'];
      const roleType = role || 'default'; // genesis, validator, setup-scripts, genesis-patch, ics-proposal
      return path.join(
        baseDir,
        chainName as string,
        `${roleType}-${kind}.yaml`
      );
    } else if (partOf === 'global') {
      // Global configmaps: outputs/configmaps/<clean-name>.yaml (remove redundant suffixes)
      const cleanName = name.replace(/-?configmap$/, ''); // Remove -configmap or configmap suffix
      return path.join(baseDir, 'configmaps', `${cleanName}.yaml`);
    } else if (component) {
      // Component resources: outputs/<component>/<clean-kind>.yaml (remove redundant prefixes)
      const cleanName = name.replace(new RegExp(`^${component}-?`), ''); // Remove component prefix
      const fileName = cleanName ? `${cleanName}-${kind}.yaml` : `${kind}.yaml`;
      return path.join(baseDir, component as string, fileName);
    } else {
      // Fallback: outputs/<n>-<kind>.yaml
      return path.join(baseDir, `${name}-${kind}.yaml`);
    }
  }

  private writeManifestToPath(manifest: Manifest, filePath: string): void {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Normalize IntOrString fields before YAML serialization
    const normalizedManifest = this.normalizeIntOrStringFields(manifest);

    // Configure YAML dump options for proper script formatting
    const yamlOptions: yaml.DumpOptions = {
      lineWidth: -1, // Disable line wrapping
      noRefs: true,  // Avoid references
      styles: {
        '!!str': this.getStringStyle.bind(this)
      }
    };

    // Write YAML file
    fs.writeFileSync(filePath, yaml.dump(normalizedManifest, yamlOptions));
  }

  /**
   * Determine the appropriate YAML string style based on content
   */
  private getStringStyle(str: string): 'literal' | 'folded' | 'plain' | 'quoted' {
    // Use literal style for shell scripts and multiline content that needs to preserve newlines
    if (this.isShellScript(str) || this.isMultilineWithSpecialFormatting(str)) {
      return 'literal';
    }
    
    // Use plain style for simple strings
    return 'plain';
  }

  /**
   * Check if string content appears to be a shell script
   */
  private isShellScript(str: string): boolean {
    const lines = str.split('\n');
    
    // Check for shell script indicators
    const shellIndicators = [
      /^#!/,                    // Shebang
      /^set\s+/,               // Shell options (set -e, set -x, etc.)
      /^\s*echo\s+/,           // Echo commands
      /^\s*if\s*\[/,           // Conditional statements
      /^\s*for\s+\w+\s+in/,    // For loops
      /^\s*while\s+/,          // While loops
      /^\s*function\s+/,       // Function definitions
      /\$\{?\w+\}?/,           // Variable references
      /\|\s*\w+/,              // Pipes
      /&&|\|\|/,               // Logical operators
    ];

    // Check if multiple lines contain shell patterns
    let shellPatternCount = 0;
    for (const line of lines.slice(0, 10)) { // Check first 10 lines
      if (shellIndicators.some(pattern => pattern.test(line))) {
        shellPatternCount++;
      }
    }

    return shellPatternCount >= 2; // Require at least 2 shell patterns
  }

  /**
   * Check if string has multiline content that needs special formatting
   */
  private isMultilineWithSpecialFormatting(str: string): boolean {
    const lines = str.split('\n');
    
    // More than 3 lines with meaningful content
    if (lines.filter(line => line.trim().length > 0).length <= 3) {
      return false;
    }

    // Check for configuration files, scripts, or structured content
    const needsFormatting = [
      /^\s*[A-Z_]+\s*=\s*/,      // Environment variables
      /^\s*\[[^\]]+\]/,          // Config sections
      /^\s*#\s*/,                // Comments
      /^\s*\w+:\s*/,             // Key-value pairs
      /^\s*-\s+/,                // List items
    ];

    return lines.some(line => needsFormatting.some(pattern => pattern.test(line)));
  }

  private writeManifests(manifests: Manifest[], outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    manifests.forEach((manifest) => {
      const outputPath = this.getManifestOutputPath(manifest, outputDir);
      this.writeManifestToPath(manifest, outputPath);
    });
  }

  build(outputDir: string): Manifest[] {
    const builders = [
      new ChainBuilder(this.config),
      new RegistryBuilder(this.config),
      new ExplorerBuilder(this.config),
      new FrontendBuilder(this.config),
      new RelayerBuilder(this.config),
      new IngressBuilder(this.config),
      new MonitoringBuilder(this.config)
    ];

    let allManifests: Manifest[] = [];

    builders.forEach((builder) => {
      allManifests = allManifests.concat(builder.generate());
    });

    this.writeManifests(allManifests, outputDir);

    return allManifests;
  }
}
