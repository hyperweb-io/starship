import chalk from 'chalk';
import deepmerge from 'deepmerge';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { mkdirp } from 'mkdirp';
import * as os from 'os';
import { dirname, resolve } from 'path';
import * as shell from 'shelljs';

import { Chain, Relayer, StarshipConfig } from './config';
import { Ports } from './config';
import { dependencies as defaultDependencies, Dependency } from './deps';
import { readAndParsePackageJson } from './package';
import { verify } from './verifiers';

export interface StarshipContext {
  name?: string;
  config?: string;
  repo?: string;
  repoUrl?: string;
  chart?: string;
  version?: string;
  namespace?: string;
  verbose?: boolean;
  curdir?: string;
  timeout?: string;
  restartThreshold?: number;
}

export const defaultStarshipContext: Partial<StarshipContext> = {
  name: '',
  repo: 'starship',
  repoUrl: 'https://hyperweb-io.github.io/starship/',
  chart: 'starship/devnet',
  namespace: '',
  version: '',
  timeout: '10m',
  restartThreshold: 3
};

export interface PodPorts {
  registry?: Ports;
  explorer?: Ports;
  chains?: {
    defaultPorts?: Ports;
    [chainName: string]: Ports;
  };
  relayers?: {
    defaultPorts?: Ports;
    [relayerName: string]: Ports;
  };
}

const defaultName: string = 'starship';
const defaultVersion: string = 'v1.6.0';

// TODO talk to Anmol about moving these into yaml, if not already possible?
const defaultPorts: PodPorts = {
  explorer: {
    rest: 8080
  },
  registry: {
    grpc: 9090,
    rest: 8080
  },
  chains: {
    ethereum: {
      rpc: 8551,
      rest: 8545,
      ws: 8546
    },
    defaultPorts: {
      rpc: 26657,
      grpc: 9090,
      'grpc-web': 9091,
      rest: 1317,
      exposer: 8081,
      faucet: 8000,
      cometmock: 22331
    }
  },
  relayers: {
    defaultPorts: {
      rest: 3000,
      exposer: 8081
    }
  }
};
export interface StarshipClientI {
  ctx: StarshipContext;
  version: string;
  dependencies: Dependency[];
  depsChecked: boolean;
  config: StarshipConfig;
  podPorts: PodPorts;
}

export interface PodStatus {
  phase: string;
  ready: boolean;
  restartCount: number;
  reason?: string;
}

export interface ExecOptions {
  log?: boolean;
  silent?: boolean;
  ignoreError?: boolean;
}

const defaultExecOptions: ExecOptions = {
  log: true,
  silent: false,
  ignoreError: true
};

export const formatChainID = (input: string): string => {
  // Replace underscores with hyphens
  let formattedName = input.replace(/_/g, '-');

  // Truncate the string to a maximum length of 63 characters
  if (formattedName.length > 63) {
    formattedName = formattedName.substring(0, 63);
  }

  return formattedName;
};

export class StarshipClient implements StarshipClientI {
  ctx: StarshipContext;
  version: string;
  dependencies: Dependency[] = defaultDependencies;
  depsChecked: boolean = false;
  config: StarshipConfig;
  podPorts: PodPorts = defaultPorts;

  private podStatuses = new Map<string, PodStatus>(); // To keep track of pod statuses

  constructor(ctx: StarshipContext) {
    this.ctx = deepmerge(defaultStarshipContext, ctx);
    // TODO add semver check against net
    this.version = readAndParsePackageJson().version;
  }

  private exec(
    cmd: string[],
    options: Partial<ExecOptions> = {}
  ): shell.ShellString {
    const opts = { ...defaultExecOptions, ...options };
    this.checkDependencies();
    const str = cmd.join(' ');
    if (opts.log) this.log(str);

    const result = shell.exec(str, { silent: opts.silent });

    if (result.code !== 0 && !opts.ignoreError) {
      this.log(chalk.red('Error: ') + result.stderr);
      this.exit(result.code);
    }

    return result;
  }

  private log(str: string): void {
    // add log level
    console.log(str);
  }

  private exit(code: number): void {
    shell.exit(code);
  }

  private checkDependencies(): void {
    if (this.depsChecked) return;

    // so CI/CD and local dev work nicely
    const platform = process.env.NODE_ENV === 'test' ? 'linux' : os.platform();
    const messages: string[] = [];
    const depMessages: string[] = [];
    const missingDependencies = this.dependencies.filter(
      (dep) => !dep.installed
    );

    if (!missingDependencies.length) {
      this.depsChecked = true;
      return;
    }

    this.dependencies.forEach((dep) => {
      if (missingDependencies.find((d) => d.name === dep.name)) {
        depMessages.push(`${chalk.red('x')}${dep.name}`);
      } else {
        depMessages.push(`${chalk.green('✓')}${dep.name}`);
      }
    });

    messages.push('\n'); // Adding a newline for better readability

    missingDependencies.forEach((dep) => {
      messages.push(chalk.bold.white(dep.name + ': ') + chalk.cyan(dep.url));

      if (dep.name === 'helm' && platform === 'darwin') {
        messages.push(
          chalk.gray('Alternatively, you can install using brew: ') +
            chalk.white.bold('`brew install helm`')
        );
      }

      if (dep.name === 'kubectl' && platform === 'darwin') {
        messages.push(
          chalk.gray(
            'Alternatively, you can install Docker for Mac which includes Kubernetes: '
          ) + chalk.white.bold(dep.macUrl)
        );
      }

      if (dep.name === 'docker' && platform === 'darwin') {
        messages.push(
          chalk.gray('For macOS, you may also consider Docker for Mac: ') +
            chalk.white.bold(dep.macUrl)
        );
      } else if (dep.name === 'docker') {
        messages.push(
          chalk.gray(
            'For advanced Docker usage and installation on other platforms, see: '
          ) + chalk.white.bold(dep.url)
        );
      }

      messages.push('\n'); // Adding a newline for separation between dependencies
    });

    this.log(depMessages.join('\n'));
    this.log('\nPlease install the missing dependencies:');
    this.log(messages.join('\n'));
    this.exit(1);
  }

  public setup(): void {
    this.setupHelm();
  }

  private loadYaml(filename: string): any {
    const path = filename.startsWith('/')
      ? filename
      : resolve((process.cwd(), filename));
    const fileContents = readFileSync(path, 'utf8');
    return yaml.load(fileContents);
  }

  private saveYaml(filename: string, obj: any): any {
    const path = filename.startsWith('/')
      ? filename
      : resolve((process.cwd(), filename));
    const yamlContent = yaml.dump(obj);
    mkdirp.sync(dirname(path));
    writeFileSync(path, yamlContent, 'utf8');
  }

  public loadConfig(): void {
    this.ensureFileExists(this.ctx.config);
    this.config = this.loadYaml(this.ctx.config) as StarshipConfig;
    this.overrideNameAndVersion();
  }

  public saveConfig(): void {
    this.saveYaml(this.ctx.config, this.config);
  }

  public savePodPorts(filename: string): void {
    this.saveYaml(filename, this.podPorts);
  }

  public loadPodPorts(filename: string): void {
    this.ensureFileExists(filename);
    this.podPorts = this.loadYaml(filename) as PodPorts;
  }

  public setConfig(config: StarshipConfig): void {
    this.config = config;
    this.overrideNameAndVersion();
  }

  public setContext(ctx: StarshipContext): void {
    this.ctx = ctx;
  }

  public setPodPorts(ports: PodPorts): void {
    this.podPorts = deepmerge(defaultPorts, ports);
  }

  private overrideNameAndVersion(): void {
    if (!this.config) {
      throw new Error('no config!');
    }

    // Override config name and version if provided in context
    if (this.ctx.name) {
      this.config.name = this.ctx.name;
    }
    if (this.ctx.version) {
      this.config.version = this.ctx.version;
    }

    // Use default name and version if not provided
    if (!this.config.name) {
      this.log(
        chalk.yellow('No name specified, using default name: ' + defaultName)
      );
      this.config.name = defaultName;
    }
    if (!this.config.version) {
      this.log(
        chalk.yellow(
          'No version specified, using default version: ' + defaultVersion
        )
      );
      this.config.version = defaultVersion;
    }

    this.log('config again: ' + this.config);
  }

  public getArgs(): string[] {
    const args = [];
    if (this.ctx.namespace) {
      args.push('--namespace', this.ctx.namespace);
    }
    return args;
  }

  public getDeployArgs(): string[] {
    const args = this.getArgs();
    if (this.ctx.namespace) {
      args.push('--create-namespace');
    }
    return args;
  }

  // TODO do we need this here?
  public test(): void {
    this.exec([
      'yarn',
      'run',
      'jest',
      `--testPathPattern=../${this.ctx.repo}`,
      '--verbose',
      '--bail'
    ]);
  }

  public async stop(): Promise<void> {
    this.stopPortForward();
    this.setPodStatues(); // set pod statues before deleting the helm
    this.deleteHelm();
    await this.waitForPodsTermination();
  }

  public async start(): Promise<void> {
    this.checkConnection();
    this.setup();
    this.deploy();
    await this.waitForPods(); // Ensure waitForPods completes before starting port forwarding
    this.startPortForward();
  }

  public setupHelm(): void {
    this.exec(['helm', 'repo', 'add', this.ctx.repo, this.ctx.repoUrl], {
      ignoreError: false
    });
    this.exec(['helm', 'repo', 'update'], { ignoreError: false });
    this.exec(
      [
        'helm',
        'search',
        'repo',
        this.ctx.chart,
        '--version',
        this.config.version
      ],
      { ignoreError: false }
    );
  }

  private ensureFileExists(filename: string): void {
    const path = filename.startsWith('/')
      ? filename
      : resolve((process.cwd(), filename));
    if (!existsSync(path)) {
      throw new Error(`Configuration file not found: ${filename}`);
    }
  }

  public deploy(options: string[] = []): void {
    this.ensureFileExists(this.ctx.config);
    this.log('Installing the helm chart. This is going to take a while.....');

    const cmd: string[] = [
      'helm',
      'install',
      '-f',
      this.ctx.config,
      this.config.name,
      this.ctx.chart,
      '--version',
      this.config.version,
      '--timeout',
      this.ctx.timeout,
      ...this.getDeployArgs(),
      ...options
    ];

    // Determine the data directory of the config file
    const datadir = resolve(dirname(this.ctx.config!));

    // Iterate through each chain to add script arguments
    this.config.chains.forEach((chain, chainIndex) => {
      if (chain.scripts) {
        Object.keys(chain.scripts).forEach((scriptKey) => {
          const script = chain.scripts?.[scriptKey as keyof Chain['scripts']];
          if (script && script.file) {
            const scriptPath = resolve(datadir, script.file);
            cmd.push(
              `--set-file chains[${chainIndex}].scripts.${scriptKey}.data=${scriptPath}`
            );
          }
        });
      }
    });

    this.exec(cmd, { ignoreError: false });
    this.log('Run "starship get-pods" to check the status of the cluster');
  }

  public debug(): void {
    this.ensureFileExists(this.ctx.config);
    this.deploy(['--dry-run', '--debug']);
  }

  public deleteHelm(): void {
    this.exec(['helm', 'delete', this.config.name, ...this.getArgs()]);
  }

  public getPods(): void {
    this.exec([
      'kubectl',
      'get pods',
      ...this.getArgs()
      // "--all-namespaces"
    ]);
  }

  public checkConnection(): void {
    const result = this.exec(['kubectl', 'get', 'nodes'], {
      log: false,
      silent: true
    });

    if (result.code !== 0) {
      this.log(
        chalk.red('Error: Unable to connect to the Kubernetes cluster.')
      );
      this.log(
        chalk.red(
          'Please ensure that the Kubernetes cluster is configured correctly.'
        )
      );
      this.exit(1);
    } else {
      this.log(
        chalk.green('Kubernetes cluster connection is working correctly.')
      );
    }
  }

  private getPodNames(): string[] {
    const result = this.exec(
      [
        'kubectl',
        'get',
        'pods',
        '--no-headers',
        '-o',
        'custom-columns=:metadata.name',
        ...this.getArgs()
      ],
      { log: false, silent: true }
    );

    // Split the output by new lines and filter out any empty lines
    const podNames = result.split('\n').filter((name) => name.trim() !== '');

    return podNames;
  }

  public areAllPodsRunning(): boolean {
    let allRunning = true;
    this.podStatuses.forEach((status) => {
      if (status.phase !== 'Running' || !status.ready) {
        allRunning = false;
      }
    });
    return allRunning;
  }

  private checkPodStatus(podName: string, exitEarly: boolean = true): void {
    const result = this.exec(
      [
        'kubectl',
        'get',
        'pods',
        podName,
        '--no-headers',
        '-o',
        'custom-columns=:status.phase,:status.containerStatuses[*].ready,:status.containerStatuses[*].restartCount,:status.containerStatuses[*].state.waiting.reason',
        ...this.getArgs()
      ],
      { log: false, silent: true }
    ).trim();

    // Ensure the output contains valid fields to split
    const parts = result.split(/\s+/);
    if (parts.length < 3) {
      this.log(
        chalk.red(`Unexpected pod status output for ${podName}: ${result}`)
      );
      return;
    }

    const [phase, readyList, restartCountList, reason] = parts;

    // Validate readyList and restartCountList before applying split
    if (!readyList || !restartCountList) {
      this.log(
        chalk.red(
          `Invalid ready or restart count for pod ${podName}: ${result}`
        )
      );
      return;
    }

    const ready = readyList.split(',').every((state) => state === 'true');
    const restarts = restartCountList
      .split(',')
      .reduce((acc, count) => acc + parseInt(count, 10), 0);

    // check for repeated image pull errors
    this.checkImagePullFailures(podName, exitEarly);

    this.podStatuses.set(podName, {
      phase,
      ready,
      restartCount: restarts,
      reason
    });

    if (restarts > this.ctx.restartThreshold) {
      this.log(
        `${chalk.red('Error:')} Pod ${podName} has restarted more than ${this.ctx.restartThreshold} times.`
      );
      if (exitEarly) this.exit(1);
    }
  }

  private setPodStatues(): void {
    const podNames = this.getPodNames();

    podNames.forEach((podName) => {
      this.checkPodStatus(podName, false); // set exitEarly to false, only set the this.PodStatuses
    });
  }

  public async waitForPods(): Promise<void> {
    const podNames = this.getPodNames();

    // Remove pods that are no longer active from the podStatuses map
    this.podStatuses.forEach((_value, podName) => {
      if (!podNames.includes(podName)) {
        this.podStatuses.delete(podName);
      }
    });

    // Check the status of each pod retrieved
    podNames.forEach((podName) => {
      this.checkPodStatus(podName);
    });

    this.displayPodStatuses();

    if (!this.areAllPodsRunning()) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await this.waitForPods(); // Recursive call
    } else {
      this.log(chalk.green('All pods are running!'));
      // once the pods are in running state, wait for 10 more seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  public async waitForPodsTermination(): Promise<void> {
    const podNames = this.getPodNames();

    // Remove pods that are no longer active from the podStatuses map
    this.podStatuses.forEach((_value, podName) => {
      if (!podNames.includes(podName)) {
        this.podStatuses.delete(podName);
      }
    });

    if (this.podStatuses.size === 0) {
      this.log(chalk.green('All pods have been successfully terminated!'));
      // once the pods are in done state, wait for 1 more seconds
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    // Check the status of each pod to terminating
    podNames.forEach((podName) => {
      const podStatus = this.podStatuses.get(podName);
      podStatus.phase = 'Terminating';
    });
    this.displayPodStatuses();

    await new Promise((resolve) => setTimeout(resolve, 2500));
    await this.waitForPodsTermination(); // Recursive call
  }

  private displayPodStatuses(): void {
    console.clear();
    this.podStatuses.forEach((status, podName) => {
      let statusColor;
      if (status.phase === 'Running' && status.ready) {
        statusColor = chalk.green(status.phase);
      } else if (status.phase === 'Running' && !status.ready) {
        statusColor = chalk.yellow('RunningButNotReady');
      } else if (status.phase === 'Terminating') {
        statusColor = chalk.red(status.phase);
      } else {
        statusColor = chalk.red(status.phase);
      }

      console.log(
        `[${chalk.blue(podName)}]: ${statusColor}, ${chalk.gray(`Ready: ${status.ready}, Restarts: ${status.restartCount}`)}`
      );
    });
  }

  public checkImagePullFailures(
    podName: string,
    exitEarly: boolean = true
  ): void {
    // Fetch events from kubectl describe for the given pod
    const eventLines = this.getPodEventsFromDescribe(podName);
    const errorPattern = /Failed to pull image/;
    const imageErrors: { [image: string]: number } = {};

    // Parse through event lines to identify image pull failures
    eventLines.forEach((line) => {
      const message = line || '';
      if (errorPattern.test(message)) {
        const imageMatch = message.match(/image "(.*?)"/);
        if (imageMatch && imageMatch[1]) {
          const imageName = imageMatch[1];
          imageErrors[imageName] = (imageErrors[imageName] || 0) + 1;
        }
      }
    });

    // Log errors for images that have failed more than twice
    Object.entries(imageErrors).forEach(([imageName, errorCount]) => {
      if (errorCount >= 3) {
        this.log(
          `${chalk.red(
            `
            Error: Image '${imageName}' failed to pull ${errorCount} times for pod ${podName}.
            Please check the image name and ensure it is correct.
            Run "starship stop" to stop the deployment which would be in stuck state.
            `
          )}`
        );
        if (exitEarly) this.exit(1);
      }
    });
  }

  private getPodEventsFromDescribe(podName: string): string[] {
    // Execute the 'kubectl describe pod' command
    const result = this.exec(
      ['kubectl', 'describe', 'pod', podName, ...this.getArgs()],
      { log: false, silent: true }
    );

    // Check if the command was successful
    if (result.code !== 0) {
      this.log(
        chalk.red(`Failed to describe pod ${podName}: ${result.stderr}`)
      );
      return [];
    }

    const describeOutput = result.stdout;

    // Extract the 'Events' section from the describe output
    const eventsSection = describeOutput.split('Events:')[1];
    if (!eventsSection) {
      this.log(chalk.yellow(`No events found for pod ${podName}`));
      return [];
    }

    // Split the events section into individual lines
    const eventLines = eventsSection
      .split('\n')
      .filter((line) => line.trim() !== '');

    return eventLines;
  }

  private forwardPort(
    chain: Chain,
    localPort: number,
    externalPort: number
  ): void {
    let podName: string;
    if (typeof chain.id === 'string') {
      podName = `${formatChainID(chain.id)}-genesis-0`;
    } else {
      podName = `${chain.name}-${chain.id}-0`;
    }

    if (localPort !== undefined && externalPort !== undefined) {
      this.exec([
        'kubectl',
        'port-forward',
        `pods/${podName}`,
        `${localPort}:${externalPort}`,
        ...this.getArgs(),
        '>',
        '/dev/null',
        '2>&1',
        '&'
      ]);
      this.log(
        chalk.yellow(
          `Forwarded ${podName}: local ${localPort} -> target (host) ${externalPort}`
        )
      );
    }
  }

  private forwardPortCometmock(
    chain: Chain,
    localPort: number,
    externalPort: number
  ): void {
    let podName: string;
    if (typeof chain.id === 'string') {
      podName = `${formatChainID(chain.id)}-cometmock-0`;
    } else {
      podName = `${chain.name}-${chain.id}-0`;
    }

    if (localPort !== undefined && externalPort !== undefined) {
      this.exec([
        'kubectl',
        'port-forward',
        `pods/${podName}`,
        `${localPort}:${externalPort}`,
        ...this.getArgs(),
        '>',
        '/dev/null',
        '2>&1',
        '&'
      ]);
      this.log(
        chalk.yellow(
          `Forwarded ${podName}: local ${localPort} -> target (host) ${externalPort}`
        )
      );
    }
  }

  private forwardPortRelayer(
    relayer: Relayer,
    localPort: number,
    externalPort: number
  ): void {
    if (localPort !== undefined && externalPort !== undefined) {
      this.exec([
        'kubectl',
        'port-forward',
        `pods/${relayer.type}-${relayer.name}-0`,
        `${localPort}:${externalPort}`,
        ...this.getArgs(),
        '>',
        '/dev/null',
        '2>&1',
        '&'
      ]);
      this.log(
        chalk.yellow(
          `Forwarded ${relayer.name}: local ${localPort} -> target (host) ${externalPort}`
        )
      );
    }
  }

  private forwardPortService(
    serviceName: string,
    localPort: number,
    externalPort: number
  ): void {
    if (localPort !== undefined && externalPort !== undefined) {
      this.exec([
        'kubectl',
        'port-forward',
        `service/${serviceName}`,
        `${localPort}:${externalPort}`,
        ...this.getArgs(),
        '>',
        '/dev/null',
        '2>&1',
        '&'
      ]);
      this.log(
        chalk.yellow(
          `Forwarded ${serviceName}: local ${localPort} -> target (host) ${externalPort}`
        )
      );
    }
  }

  public startPortForward(): void {
    if (!this.config) {
      throw new Error('no config!');
    }
    this.log('Attempting to stop any existing port-forwards...');
    this.stopPortForward();
    this.log('Starting new port forwarding...');

    this.config.chains?.forEach((chain) => {
      const chainPodPorts =
        this.podPorts.chains[chain.name] || this.podPorts.chains.defaultPorts;

      Object.entries(chain.ports || {}).forEach(([portName, portValue]) => {
        if (chainPodPorts[portName as keyof Ports]) {
          if (chain.cometmock?.enabled && portName === 'rpc') {
            this.forwardPortCometmock(
              chain,
              portValue,
              chainPodPorts.cometmock
            );
          } else {
            this.forwardPort(
              chain,
              portValue,
              chainPodPorts[portName as keyof Ports]
            );
          }
        }
      });
    });

    this.config.relayers?.forEach((relayer) => {
      const relayerPodPorts =
        this.podPorts.relayers[relayer.name] ||
        this.podPorts.relayers.defaultPorts;
      if (relayer.ports?.rest)
        this.forwardPortRelayer(
          relayer,
          relayer.ports.rest,
          relayerPodPorts.rest
        );
      if (relayer.ports?.exposer)
        this.forwardPortRelayer(
          relayer,
          relayer.ports.exposer,
          relayerPodPorts.exposer
        );
    });

    if (this.config.registry?.enabled) {
      this.forwardPortService(
        'registry',
        this.config.registry.ports.rest,
        this.podPorts.registry.rest
      );
      this.forwardPortService(
        'registry',
        this.config.registry.ports.grpc,
        this.podPorts.registry.grpc
      );
    }

    if (this.config.explorer?.enabled) {
      this.forwardPortService(
        'explorer',
        this.config.explorer.ports.rest,
        this.podPorts.explorer.rest
      );
    }

    // Forward ports for frontend services
    this.config.frontends?.forEach((frontend) => {
      if (frontend.ports) {
        if (frontend.ports.rest) {
          this.forwardPortService(
            frontend.name,
            frontend.ports.rest,
            frontend.ports.rest
          );
        }
      }
    });
  }

  private getForwardPids(): string[] {
    const result = this.exec(
      [
        'ps',
        '-ef',
        '|',
        'grep',
        '-i',
        "'kubectl port-forward'",
        '|',
        'grep',
        '-v',
        "'grep'",
        '|',
        'awk',
        "'{print $2}'"
      ],
      { log: false, silent: true }
    );
    const pids = (result || '')
      .split('\n')
      .map((pid) => pid.trim())
      .filter((a) => a !== '');
    return pids;
  }

  public stopPortForward(): void {
    this.log(chalk.green('Trying to stop all port-forward, if any....'));
    const pids = this.getForwardPids();
    pids.forEach((pid) => {
      this.exec(['kill', '-15', pid], { log: false, silent: true });
    });
    this.exec(['sleep', '2'], { log: false, silent: true });
  }

  public printForwardPids(): void {
    const pids = this.getForwardPids();
    pids.forEach((pid) => {
      console.log(pid);
    });
  }

  public async verify(): Promise<void> {
    this.log(chalk.blue('Verifying services...'));
    const results = await verify(this.config);

    let allSuccess = true;
    for (const result of results) {
      const statusColor =
        result.status === 'success'
          ? 'green'
          : result.status === 'skipped'
            ? 'yellow'
            : 'red';
      const status = chalk[statusColor](result.status.toUpperCase());
      const message = result.message || result.error || '';
      const details = result.details
        ? JSON.stringify(result.details, null, 2)
        : '';

      this.log(`${status} ${result.service} (${result.endpoint}): ${message}`);
      if (details && result.status === 'failure') {
        this.log(chalk.gray(`Details: ${details}`));
      }

      if (result.status === 'failure') {
        allSuccess = false;
      }
    }

    if (!allSuccess) {
      this.log(
        chalk.red(
          '\nSome services failed verification. Please check the logs above.'
        )
      );
      this.exit(1);
    } else {
      this.log(chalk.green('\nAll services verified successfully!'));
      this.exit(0);
    }
  }
}
