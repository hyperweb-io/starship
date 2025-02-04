# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.2.0](https://github.com/hyperweb-io/starship/compare/v3.1.0...v3.2.0) (2025-02-03)

**Note:** Version bump only for package starship-js

# [3.1.0](https://github.com/hyperweb-io/starship/compare/v3.0.0...v3.1.0) (2025-02-01)

**Note:** Version bump only for package starship-js

# 3.0.0 (2025-01-30)

### Bug Fixes

- add chain names to registry information, set chain_name to chain name instead of previously chain id ([#496](https://github.com/hyperweb-io/starship/issues/496)) ([c0ca630](https://github.com/hyperweb-io/starship/commit/c0ca63059be52c5f56aaa38c7df7d07ed7ea39de))
- add check to run all steps in conditions ([#276](https://github.com/hyperweb-io/starship/issues/276)) ([c471714](https://github.com/hyperweb-io/starship/commit/c471714903dde873efb14ccb60884495b1c4cb76))
- add cors middleware after panice recovery middleware ([f5ca5e5](https://github.com/hyperweb-io/starship/commit/f5ca5e51b2a61a6662632c504773c64a866112d0))
- charts and images, update defaults, fix neutron and injective scripts ([#394](https://github.com/hyperweb-io/starship/issues/394)) ([970f32d](https://github.com/hyperweb-io/starship/commit/970f32d6c6e639494c6d6f2e740ac705bb775e94))
- evmos injective multi node ([#246](https://github.com/hyperweb-io/starship/issues/246)) ([c5aad21](https://github.com/hyperweb-io/starship/commit/c5aad21a1e1d607c5f723d11af8adc3708220368))
- port-forward-script to include grpc port forwarding ([#200](https://github.com/hyperweb-io/starship/issues/200)) ([b6c509b](https://github.com/hyperweb-io/starship/commit/b6c509b205ced78460bf4850a2861063d79844e2))
- push condition for starship docker action ([3879943](https://github.com/hyperweb-io/starship/commit/3879943b482eff1361896dc6af35888c99b8b37b))
- read init resources from values.yaml ([#102](https://github.com/hyperweb-io/starship/issues/102)) ([8346465](https://github.com/hyperweb-io/starship/commit/83464657960655d2698c2871433e18c1251b578e))
- respect custom registry and explorer ports ([#561](https://github.com/hyperweb-io/starship/issues/561)) ([e4e2a78](https://github.com/hyperweb-io/starship/commit/e4e2a7801f7fe538a6fcc003e8fd698d1cfa51a6))
- start to fix the faucet for balances ([#489](https://github.com/hyperweb-io/starship/issues/489)) ([cee9c31](https://github.com/hyperweb-io/starship/commit/cee9c31934018c3fe834629752fa316d7bb2c290))
- typos ([#258](https://github.com/hyperweb-io/starship/issues/258)) ([d806cb6](https://github.com/hyperweb-io/starship/commit/d806cb613088ebbdbf11ed2548fe142123222670))
- typos ([#505](https://github.com/hyperweb-io/starship/issues/505)) ([9a748d2](https://github.com/hyperweb-io/starship/commit/9a748d2fa6d7d9015245f06689f948472e8c05a8))
- update some defaults for neutron ([#517](https://github.com/hyperweb-io/starship/issues/517)) ([6fd5244](https://github.com/hyperweb-io/starship/commit/6fd5244cfec0d228fe7c9e9b44f2c1020ac65f0a))
- use chain name as type of chain in registry if type is custom ([#416](https://github.com/hyperweb-io/starship/issues/416)) ([bfad04a](https://github.com/hyperweb-io/starship/commit/bfad04ab75dd22ab7ef989db56f9f0991fbdc02a))

### Features

- **build-chain:** support commit hashes and tags that do not start with `v` ([#460](https://github.com/hyperweb-io/starship/issues/460)) ([1821c44](https://github.com/hyperweb-io/starship/commit/1821c44fb0c91ab782e0667a67bef153ae605c0a))
- **client:** expose `restartThreshold` via `StarshipContext` ([#577](https://github.com/hyperweb-io/starship/issues/577)) ([afaef4e](https://github.com/hyperweb-io/starship/commit/afaef4e8a1a9bfb1856831a0b036aaa003944e34))
- custom env vars for chain ([#451](https://github.com/hyperweb-io/starship/issues/451)) ([f6928ad](https://github.com/hyperweb-io/starship/commit/f6928add1e00fe8a3e2768c7ee1a0f6b721a10d1))
- noble custom genesis ([#579](https://github.com/hyperweb-io/starship/issues/579)) ([f92fbad](https://github.com/hyperweb-io/starship/commit/f92fbad6cca06c4c108e7aa6fc5f48df65b26284))

### Reverts

- Revert "add and use template function to evaluate fullchain dict from just the name, used in all relayers (#256)" (#259) ([ac611eb](https://github.com/hyperweb-io/starship/commit/ac611ebef304c632049c9c51ca20ac3ea5a01f99)), closes [#256](https://github.com/hyperweb-io/starship/issues/256) [#259](https://github.com/hyperweb-io/starship/issues/259)
- Revert "Add creation of kubeconfig for the eks cluster in CI (#74)" (#75) ([50d93a1](https://github.com/hyperweb-io/starship/commit/50d93a1810024f4e3595beebe09cb6cb3fd8af3a)), closes [#74](https://github.com/hyperweb-io/starship/issues/74) [#75](https://github.com/hyperweb-io/starship/issues/75)
