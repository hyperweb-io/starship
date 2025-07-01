import * as shell from 'shelljs';
import { existsSync } from 'fs';

export type Dependency = {
  name: string;
  url: string;
  macUrl?: string; // Optional property for macOS-specific URLs
  installed: boolean;
};

// Function to detect if we're running inside a Docker container
function isRunningInDocker(): boolean {
  // Check for .dockerenv file
  if (existsSync('/.dockerenv')) {
    return true;
  }
  
  // Check cgroup for docker signatures
  try {
    const cgroup = shell.cat('/proc/1/cgroup');
    if (cgroup && cgroup.includes('docker')) {
      return true;
    }
  } catch (e) {
    // Ignore errors when reading cgroup
  }
  
  // Check for KUBERNETES_SERVICE_HOST which indicates we're in a K8s pod
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return true;
  }
  
  return false;
}

// Check if Docker dependency should be skipped
function shouldSkipDocker(): boolean {
  // Allow explicit skip via environment variable
  if (process.env.STARSHIP_SKIP_DOCKER_CHECK === 'true') {
    return true;
  }
  
  // Skip if we're running inside a container
  if (isRunningInDocker()) {
    console.log('Running inside a container, skipping Docker dependency check');
    return true;
  }
  
  return false;
}

export const dependencies: Dependency[] = [
  {
    name: 'kubectl',
    url: 'https://kubernetes.io/docs/tasks/tools/',
    macUrl: 'https://docs.docker.com/desktop/install/mac-install/',
    installed: !!shell.which('kubectl')
  },
  {
    name: 'docker',
    url: 'https://docs.docker.com/get-docker/',
    macUrl: 'https://docs.docker.com/desktop/install/mac-install/',
    installed: shouldSkipDocker() || !!shell.which('docker')
  },
  {
    name: 'helm',
    url: 'https://helm.sh/docs/intro/install/',
    installed: !!shell.which('helm')
  }
];
