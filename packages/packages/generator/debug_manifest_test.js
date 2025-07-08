const { join } = require('path');
const { BuilderManager } = require('./dist/builders');
const { readFileSync } = require('fs');
const yaml = require('js-yaml');

// Generate manifests for xpla config
const configPath = join(__dirname, '../../../packages/__fixtures__/configs/xpla.yaml');
const configsDir = join(__dirname, '../../../packages/__fixtures__/configs');
const outputDir = join(__dirname, '__tests__/__output__/manifest-comparison/xpla');

console.log('Loading config from:', configPath);
const fileContents = readFileSync(configPath, 'utf8');
const config = yaml.load(fileContents);
config.configDir = configsDir;

console.log('Config loaded:', config.name);
console.log('Generating manifests to:', outputDir);

const manager = new BuilderManager(config);
manager.build(outputDir);

console.log('Manifests generated successfully!'); 