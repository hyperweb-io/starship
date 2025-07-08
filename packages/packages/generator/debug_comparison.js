const { join } = require('path');
const { readFileSync } = require('fs');
const yaml = require('js-yaml');

// Copy the ManifestComparator class from the test file with the fix
class ManifestComparator {
  parseManifestFile(content) {
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
        
        const parsed = yaml.load(yamlContent);
        return this.normalizeResource(parsed);
      } catch (error) {
        throw new Error(`Failed to parse YAML document: ${error}`);
      }
    }).filter(resource => resource !== null);
  }

  normalizeResource(resource) {
    if (!resource || !resource.kind || !resource.metadata?.name) {
      return null;
    }

    const normalized = {
      apiVersion: resource.apiVersion,
      kind: resource.kind,
      metadata: {
        name: resource.metadata.name,
        ...(resource.metadata.namespace && { namespace: resource.metadata.namespace }),
        ...(resource.metadata.labels && { labels: { ...resource.metadata.labels } }),
        ...(resource.metadata.annotations && { annotations: { ...resource.metadata.annotations } })
      }
    };

    if (resource.spec) {
      normalized.spec = { ...resource.spec };
    }
    if (resource.data) {
      normalized.data = { ...resource.data };
    }

    this.removeVolatileFields(normalized);
    return normalized;
  }

  removeVolatileFields(resource) {
    if (resource.metadata.annotations) {
      delete resource.metadata.annotations['meta.helm.sh/release-name'];
      delete resource.metadata.annotations['meta.helm.sh/release-namespace'];
      
      if (Object.keys(resource.metadata.annotations).length === 0) {
        delete resource.metadata.annotations;
      }
    }

    if (resource.spec) {
      if (resource.kind === 'StatefulSet') {
        if (resource.spec.updateStrategy?.type === 'RollingUpdate') {
          delete resource.spec.updateStrategy;
        }
      }

      if (resource.kind === 'Service' && resource.spec.ports) {
        resource.spec.ports = resource.spec.ports.map((port) => ({
          ...port,
        }));
      }
    }
  }

  getResourceKey(resource) {
    const namespace = resource.metadata.namespace || 'default';
    return `${resource.kind}/${namespace}/${resource.metadata.name}`;
  }

  parseGeneratedManifests(outputDir) {
    const fs = require('fs');
    const manifests = [];
    
    const findYamlFiles = (dir) => {
      const files = [];
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

  parseExpectedManifests(manifestFile) {
    const content = readFileSync(manifestFile, 'utf-8');
    return this.parseManifestFile(content);
  }
}

// Run the comparison
const comparator = new ManifestComparator();

const generatedDir = join(__dirname, '__tests__/__output__/manifest-comparison/xpla');
const expectedFile = join(__dirname, '../../../packages/__fixtures__/config-manifests/xpla.yaml');

console.log('Parsing generated manifests...');
const generated = comparator.parseGeneratedManifests(generatedDir);

console.log('Parsing expected manifests...');
const expected = comparator.parseExpectedManifests(expectedFile);

console.log(`Generated: ${generated.length} resources`);
console.log(`Expected: ${expected.length} resources`);

console.log('\nGenerated resource keys:');
generated.forEach(r => console.log(`  ${comparator.getResourceKey(r)}`));

console.log('\nExpected resource keys:');
expected.forEach(r => console.log(`  ${comparator.getResourceKey(r)}`));

// Find differences
const generatedKeys = new Set(generated.map(r => comparator.getResourceKey(r)));
const expectedKeys = new Set(expected.map(r => comparator.getResourceKey(r)));

const missing = Array.from(expectedKeys).filter(key => !generatedKeys.has(key));
const extra = Array.from(generatedKeys).filter(key => !expectedKeys.has(key));

console.log(`\nMissing resources: ${missing.length}`);
missing.forEach(key => console.log(`  - ${key}`));

console.log(`\nExtra resources: ${extra.length}`);
extra.forEach(key => console.log(`  + ${key}`)); 