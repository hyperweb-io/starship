import { existsSync } from 'fs';
import * as shell from 'shelljs';

// Mock the modules
jest.mock('fs');
jest.mock('shelljs');

describe('Docker dependency detection', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (existsSync as jest.Mock).mockReturnValue(false);
    (shell.cat as jest.Mock).mockReturnValue('');
    (shell.which as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should detect Docker via .dockerenv file', () => {
    (existsSync as jest.Mock).mockImplementation((path: string) => {
      return path === '/.dockerenv';
    });

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(true);
  });

  test('should detect Docker via cgroup', () => {
    (shell.cat as jest.Mock).mockReturnValue('1:name=systemd:/docker/abc123');

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(true);
  });

  test('should detect Kubernetes pod environment', () => {
    process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(true);
  });

  test('should skip Docker check with environment variable', () => {
    process.env.STARSHIP_SKIP_DOCKER_CHECK = 'true';

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(true);
  });

  test('should require Docker when not in container', () => {
    (shell.which as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null; // Docker not installed
    });

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(false);
  });

  test('should detect Docker binary when available', () => {
    (shell.which as jest.Mock).mockImplementation((cmd: string) => {
      return '/usr/bin/' + cmd; // All binaries available
    });

    const { dependencies } = require('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');
    
    expect(dockerDep.installed).toBe(true);
  });
});