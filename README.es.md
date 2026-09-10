# Starship

<p align="center" width="100%">
    <img height="148" src="https://user-images.githubusercontent.com/10805402/242348990-c141d6cd-e1c9-413f-af68-283de029c3a4.png" />
</p>

<p align="center" width="100%">
   <a href="https://github.com/hyperweb-io/starship/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
   <a href="https://github.com/hyperweb-io/starship/releases/latest"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/release.yaml/badge.svg" alt="Release" /></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/build.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/build.yaml/badge.svg" alt="Build" /></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/pr-tests.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/pr-tests.yaml/badge.svg" alt="PR Tests" /></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/docs.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/docs.yaml/badge.svg" alt="Docs" /></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/starship-docker.yaml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/starship-docker.yaml/badge.svg" alt="Docker" /></a>
   <a href="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml"><img height="20" src="https://github.com/hyperweb-io/starship/actions/workflows/run-client-tests.yml/badge.svg" alt="Client Tests" /></a>
   <a href="https://www.npmjs.com/package/@starship-ci/cli"><img height="20" src="https://img.shields.io/npm/v/@starship-ci/cli.svg" alt="NPM Version" /></a>
   <a href="https://github.com/hyperweb-io/starship/tree/main/charts/devnet"><img height="20" src="https://img.shields.io/badge/devnet-1.8.0-blue" alt="Devnet Version" /></a>
   <a href="https://deepwiki.com/hyperweb-io/starship"><img height="20" src="https://deepwiki.com/badge.svg" alt="Deepwiki" /></a>
</p>

Entorno de desarrollo interchain universal en k8s. La visión de este proyecto es tener un único entorno de desarrollo fácil de usar con soporte completo de pruebas para casos de uso multichain

> Documentación automatizada: https://deepwiki.com/hyperweb-io/starship

## Starship v1 vs v2

### Starship v1 (Legacy - Stable)
- **Repositorio**: [rama v1](https://github.com/hyperweb-io/starship/tree/v1)
- **Estado**: **Estable y recomendado para uso en producción**
- **Arquitectura**: Enfoque híbrido con tecnologías mixtas
  - **Cliente**: Biblioteca de cliente basada en TypeScript
  - **Infraestructura**: Gráficos de Helm para el despliegue en Kubernetes
  - **Servicios**: Microservicios en Go para componentes principales
  - **Despliegue**: Flujo de trabajo tradicional basado en Helm con comandos de shell

### Starship v2 (Current - Under Development)
- **Repositorio**: [Rama principal](https://github.com/hyperweb-io/starship) (actual)
- **Estado**: **🚧 Bajo desarrollo activo - Use v1 para despliegues estables**
- **Arquitectura**: Migración de Helm a una arquitectura basada en KubernetesJS
  - **Objetivo**: Reemplazar las dependencias de comandos de shell (`kubectl`, `helm`, `docker`) con llamadas directas a la API
  - **Generación YAML**: Generar manifiestos de Kubernetes para su inspección antes del despliegue
  - **Acceso directo a la API**: Usar KubernetesJS para la comunicación directa con la API de Kubernetes
  - **Despliegue**: Gestión programática de recursos a través de la API de Kubernetes

### Key Goals of v2 Migration ([Epic #695](https://github.com/hyperweb-io/starship/issues/695))
- **Eliminar dependencias de shell**: Reemplazar los comandos `kubectl`, `helm`, `docker` con llamadas a la API
- **Mejor manejo de errores**: Respuestas de error estructuradas en lugar de fallos opacos de comandos de shell
- **Inspección de YAML**: Generar y revisar manifiestos de Kubernetes antes del despliegue
- **Independencia de plataforma**: Eliminar problemas de compatibilidad de comandos de shell específicos del sistema operativo
- **Depuración mejorada**: Acceso directo al estado y eventos de los recursos de Kubernetes
- **Pruebas mejoradas**: Simular el cliente KubernetesJS en lugar de una simulación compleja de comandos de shell

> **⚠️ Importante**: Para uso en producción, por favor use la [rama v1](https://github.com/hyperweb-io/starship/tree/v1) estable. La rama principal (v2) está bajo desarrollo activo como parte de la migración arquitectónica.

## Prerequisites
Para comenzar, necesitará:

* Configuración de Kubernetes (recomendado: Docker Desktop con soporte de Kubernetes para configuraciones locales): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* `kubectl`: [Guía de instalación](https://kubernetes.io/docs/tasks/tools/)
* `helm`: [Guía de instalación](https://helm.sh/docs/intro/install/)

Para obtener más información, consulte la [Documentación de Starship](https://docs.cosmology.zone/starship/get-started/step-2) sobre la configuración y el ajuste de Kubernetes.

## Install

Instale la CLI `@starship-ci/cli`:

```sh
npm install -g @starship-ci/cli
```

## Configuration
Para configurar Starship para soporte multichain, cree un archivo de configuración (por ejemplo, `config.yaml`).
Aquí tiene una configuración de muestra:

```yaml
name: starship-localnet
version: 1.8.0

chains:
- id: osmosis-1
  name: osmosis
  numValidators: 2
  ports:
    rest: 1313
    rpc: 26653
    faucet: 8003
- id: cosmoshub-4
  name: cosmoshub
  numValidators: 2
  ports:
    rest: 1317
    rpc: 26657
    faucet: 8007

relayers:
- name: osmos-cosmos
  type: hermes
  replicas: 1
  chains:
    - osmosis-1
    - cosmoshub-4

explorer:
  enabled: true
  ports:
    rest: 8080

registry:
  enabled: true
  ports:
    rest: 8081
```

Para obtener más detalles sobre las opciones de configuración y las directivas disponibles, consulte la [Configuración de Starship](https://docs.cosmology.zone/starship/config).

## Versions & Compatibility

### Current Versions
| Componente | Versión | Enlace |
|---------------------------|---------|-------------------------------------------------------------------------------------|
| Helm Chart                | 1.8.0   | -                                                                                   |
| NPM CLI de Starship       | 3.11.0  | [NPM](https://www.npmjs.com/package/@starship-ci/client/v/3.11.0)                    |
| Cliente NPM               | 3.11.0  | [NPM](https://www.npmjs.com/package/@starship-ci/cli/v/3.11.0)                       |
| NPM StarshipJS            | 3.3.0   | [NPM](https://www.npmjs.com/package/starshipjs/v/3.3.0)                            |
| GitHub Action de Starship | 1.0.0   | [Acción de GitHub](https://github.com/hyperweb-io/starship-action/releases/tag/1.0.0) |

### Compatibility Matrix
| Versión de Starship | Helm Chart | NPM CLI | Cliente NPM | StarshipJS | GitHub Action |
|---------------------|------------|-----------|-------------|------------|---------------|
| 1.8.0               | ✅ 1.8.0   | ✅ 3.11.0  | ✅ 3.11.0   | ✅ 3.3.0   | ✅ 1.0.0      |
| 1.7.0               | ✅ 1.7.0   | ✅ 3.10.0  | ✅ 3.10.0   | ✅ 3.3.0   | ✅ 1.0.0      |
| 1.6.0               | ✅ 1.6.0   | ✅ 3.6.0   | ✅ 3.6.0    | ✅ 3.3.0   | ✅ 0.5.9      |
| 1.5.0               | ✅ 1.5.0   | ✅ 3.5.0   | ✅ 3.5.0    | ✅ 3.3.0   | ✅ 0.5.9      |
| 1.4.0               | ✅ 1.4.0   | ✅ 3.4.0   | ✅ 3.4.0    | ✅ 3.3.0   | ✅ 0.5.9      |
| 1.3.0               | ✅ 1.3.0   | ✅ 3.3.0   | ✅ 3.3.0    | ✅ 3.3.0   | ✅ 0.5.9      |
| 1.2.0               | ✅ 1.2.0   | ✅ 3.2.0   | ✅ 3.2.0    | ✅ 3.0.0   | ✅ 0.5.8      |
| 1.1.0               | ✅ 1.1.0   | ✅ 3.1.0   | ✅ 3.1.0    | ✅ 3.0.0   | ✅ 0.5.6      |
| 1.0.0               | ✅ 1.0.0   | ✅ 3.0.0   | ✅ 3.0.0    | ✅ 3.0.0   | ✅ 0.5.5      |

> Nota: La versión 1.2.0+ de Starship requiere Helm 1.2.0+ y NPM CLI 3.2.0+ para una funcionalidad completa.

## Running Starship

### Deploying 🚀

```sh
yarn starship start --config config.yaml
```

### Teardown 🛠️

```sh
# stop ports and delete deployment
yarn starship stop --config config.yaml
```

## Migration to v1

Si está migrando desde una versión anterior de Starship y se enfrenta al siguiente error:
```bash
Error: repository name (starship) already exists, please specify a different name
```

Por favor, ejecute el siguiente comando:
```bash
helm repo remove starship
```

Luego se puede ejecutar:
```bash
yarn starship start --config config.yaml
```

## Recommended Usage 📘

¡Esté atento a una plantilla `create-cosmos-app`! Por ahora, esta es la configuración más recomendada. Considere todo lo demás después de esta sección como "configuración avanzada".

- Recomendamos estudiar la [integración de osmojs starship](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship) y replicarla.
- Añada sus configuraciones, de manera similar a cómo se hace [aquí](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs/starship/configs)
- Añada sus flujos de trabajo para GitHub Actions [como este](https://github.com/osmosis-labs/osmojs/blob/main/.github/workflows/e2e-tests.yaml)
- Añada comandos `yarn starship` a sus scripts de package.json [como este](https://github.com/osmosis-labs/osmojs/blob/c456184666eda55cd6fee5cd09ba6c05c898d55c/packages/osmojs/package.json#L31-L34)
— Tenga en cuenta las configuraciones de jest en el [paquete osmojs](https://github.com/osmosis-labs/osmojs/tree/main/packages/osmojs)

## Interchain JavaScript Stack ⚛️

Un conjunto de herramientas unificado para crear aplicaciones y contratos inteligentes en el ecosistema Interchain

| Categoría | Herramientas | Descripción |
|----------------------|------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| **Información de la cadena** | [**Chain Registry**](https://github.com/hyperweb-io/chain-registry), [**Utils**](https://www.npmjs.com/package/@chain-registry/utils), [**Client**](https://www.npmjs.com/package/@chain-registry/client) | Todo, desde símbolos de tokens, logotipos y denominaciones de IBC para todos los activos que desea admitir en su aplicación. |
| **Conectores de billeteras** | [**Interchain Kit**](https://github.com/hyperweb-io/interchain-kit)<sup>beta</sup>, [**Cosmos Kit**](https://github.com/hyperweb-io/cosmos-kit) | Experimente la comodidad de conectarse con una variedad de billeteras web3 a través de una interfaz única y simplificada. |
| **Clientes de firma** | [**InterchainJS**](https://github.com/hyperweb-io/interchainjs)<sup>beta</sup>, [**CosmJS**](https://github.com/cosmos/cosmjs) | Una interfaz de firma única y universal para cualquier red |
| **Clientes de SDK** | [**Telescope**](https://github.com/hyperweb-io/telescope) | Su compañero frontend para construir con TypeScript con módulos de Cosmos SDK. |
| **Kits de inicio** | [**Create Interchain App**](https://github.com/hyperweb-io/create-interchain-app)<sup>beta</sup>, [**Create Cosmos App**](https://github.com/hyperweb-io/create-cosmos-app) | Configure una aplicación Interchain moderna ejecutando un solo comando. |
| **Kits de interfaz de usuario** | [**Interchain UI**](https://github.com/hyperweb-io/interchain-ui) | El sistema de diseño de Interchain, que empodera a los desarrolladores con un kit de interfaz de usuario flexible y fácil de usar. |
| **Frameworks de prueba** | [**Starship**](https://github.com/hyperweb-io/starship) | Pruebas y desarrollo unificados para el Interchain. |
| **Contratos inteligentes de TypeScript** | [**Create Hyperweb App**](https://github.com/hyperweb-io/create-hyperweb-app) | Construya y despliegue aplicaciones de blockchain full-stack con TypeScript |
| **Contratos de CosmWasm** | [**CosmWasm TS Codegen**](https://github.com/CosmWasm/ts-codegen) | Convierta sus contratos inteligentes de CosmWasm en clases de TypeScript amigables para el desarrollador. |

## Credits

🛠 Construido por el equipo de [Constructive](https://constructive.io) — creadores de [Hyperweb](https://hyperweb.io)

## Disclaimer

COMO SE DESCRIBE EN LAS LICENCIAS, EL SOFTWARE SE PROPORCIONA "TAL CUAL", BAJO SU PROPIO RIESGO Y SIN GARANTÍAS DE NINGÚN TIPO.

Ningún desarrollador o entidad involucrada en la creación de este software será responsable de ningún reclamo o daño asociado con su uso, incapacidad de uso o su interacción con otros usuarios del código, incluidos los daños directos, indirectos, incidentales, especiales, ejemplares, punitivos o consecuentes, o la pérdida de ganancias, criptomonedas, tokens o cualquier otra cosa de valor.

## Star History

[![Gráfico de historial de estrellas](https://api.star-history.com/svg?repos=hyperweb-io/starship&type=Date)](https://star-history.com/#hyperweb-io/starship&Date)