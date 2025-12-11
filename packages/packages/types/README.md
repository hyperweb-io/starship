# @starship-ci/types

TypeScript type definitions for Starship configuration and components.

## Overview

This package provides comprehensive TypeScript types for Starship configurations, ensuring type safety across all Starship packages and user configurations.

## Installation

```sh
npm install @starship-ci/types
```

## Usage

```typescript
import { StarshipConfig, Chain, Relayer } from '@starship-ci/types';

const config: StarshipConfig = {
  name: 'my-starship',
  version: '1.8.0',
  chains: [
    {
      id: 'osmosis-1',
      name: 'osmosis',
      numValidators: 2,
      ports: {
        rest: 1313,
        rpc: 26653,
        faucet: 8003
      }
    }
  ],
  relayers: [
    {
      name: 'osmos-cosmos',
      type: 'hermes',
      replicas: 1,
      chains: ['osmosis-1', 'cosmoshub-4']
    }
  ]
};
```

## Types Included

- `StarshipConfig` - Main configuration interface
- `Chain` - Blockchain configuration
- `Relayer` - Relayer configuration  
- `Explorer` - Block explorer configuration
- `Registry` - Chain registry configuration
- `Monitoring` - Monitoring configuration
- `Ingress` - Ingress configuration
- `Frontend` - Frontend configuration
- And many more...

## Features

- **Type Safety**: Comprehensive TypeScript definitions
- **Schema Alignment**: Types match the `values.schema.json` exactly
- **Extensible**: Easy to extend for custom configurations
- **Well Documented**: JSDoc comments for all interfaces

## Credits

🛠 Built by the [Constructive](https://constructive.io) team — makers of [Hyperweb](https://hyperweb.io)
