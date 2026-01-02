# @starship-ci/generator

Kubernetes manifest generator for Starship deployments.

## Overview

This package provides utilities to generate Kubernetes YAML manifests from Starship configurations, enabling programmatic creation and customization of Kubernetes resources before deployment.

## Installation

```sh
npm install @starship-ci/generator
```

## Usage

```typescript
import { KubernetesGenerator } from '@starship-ci/generator';
import { StarshipConfig } from '@starship-ci/types';

const config: StarshipConfig = {
  // your starship configuration
};

const generator = new KubernetesGenerator(config);

// Generate all manifests
const manifests = await generator.generateAll();

// Generate specific resource types
const deployments = await generator.generateDeployments();
const services = await generator.generateServices();
const configMaps = await generator.generateConfigMaps();

// Write manifests to files
await generator.writeManifests('./k8s-manifests');
```

## Features

- **YAML Generation**: Convert Starship configs to Kubernetes manifests
- **Resource Types**: Support for Deployments, Services, ConfigMaps, and more
- **Customizable**: Programmatically modify resources before deployment
- **Type Safe**: Built with TypeScript using `@starship-ci/types`
- **Validation**: Validate generated manifests against Kubernetes schemas

## Supported Resources

- Deployments
- Services  
- ConfigMaps
- Secrets
- Ingress
- PersistentVolumeClaims
- ServiceAccounts
- RBAC (Roles, RoleBindings)

## Part of Starship v2

This package is part of the Starship v2 architecture migration from Helm to KubernetesJS. It enables:

- **YAML Inspection**: Review generated manifests before deployment
- **Programmatic Control**: Modify resources via code instead of templates
- **Better Debugging**: Clear visibility into what will be deployed

## Credits

🛠 Built by the [Constructive](https://constructive.io) team — makers of [Hyperweb](https://hyperweb.io)
