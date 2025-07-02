// Mock the modules before importing anything else
jest.mock('fs');
jest.mock('shelljs');

describe('Docker dependency detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Clear module cache

    // Reset environment to original state
    process.env = { ...originalEnv };

    // Explicitly remove any environment variables that could affect tests
    delete process.env.KUBERNETES_SERVICE_HOST;
    delete process.env.STARSHIP_SKIP_DOCKER_CHECK;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should detect Docker via .dockerenv file', async () => {
    const fs = require('fs');
    const shell = require('shelljs');
    
    fs.existsSync = jest.fn().mockImplementation((path: string) => {
      return path === '/.dockerenv';
    });
    
    shell.cat = jest.fn().mockReturnValue({
      includes: (_str: string) => false,
      toString: () => ''
    });
    
    shell.which = jest.fn().mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null;
    });

    const { dependencies } = await import('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');

    expect(dockerDep).toBeDefined();
    expect(dockerDep.installed).toBe(true);
  });

  test('should detect Docker via cgroup', async () => {
    const fs = require('fs');
    const shell = require('shelljs');
    
    fs.existsSync = jest.fn().mockImplementation((path: string) => {
      // /proc/1/cgroup exists but /.dockerenv doesn't
      return path === '/proc/1/cgroup';
    });
    
    shell.cat = jest.fn().mockReturnValue({
      includes: (str: string) => str === 'docker',
      toString: () => '1:name=systemd:/docker/abc123'
    });
    
    shell.which = jest.fn().mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null;
    });

    const { dependencies } = await import('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');

    expect(dockerDep).toBeDefined();
    expect(dockerDep.installed).toBe(true);
  });

  test('should detect Kubernetes pod environment', async () => {
    const fs = require('fs');
    const shell = require('shelljs');
    
    process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';
    
    fs.existsSync = jest.fn().mockReturnValue(false);
    
    shell.cat = jest.fn().mockReturnValue({
      includes: (_str: string) => false,
      toString: () => ''
    });
    
    shell.which = jest.fn().mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null;
    });

    const { dependencies } = await import('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');

    expect(dockerDep).toBeDefined();
    expect(dockerDep.installed).toBe(true);

    // Clean up
    delete process.env.KUBERNETES_SERVICE_HOST;
  });

  test('should require Docker when not in container', async () => {
    const fs = require('fs');
    const shell = require('shelljs');
    
    // Ensure we're not detected as running in a container
    fs.existsSync = jest.fn().mockReturnValue(false); // No .dockerenv file
    
    shell.cat = jest.fn().mockReturnValue({
      includes: (_str: string) => false, // No docker in cgroup
      toString: () => 'some-other-cgroup-content'
    });
    
    delete process.env.KUBERNETES_SERVICE_HOST; // Not in Kubernetes
    delete process.env.STARSHIP_SKIP_DOCKER_CHECK; // Don't skip the check

    shell.which = jest.fn().mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null; // Docker not installed
    });

    const { dependencies } = await import('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');

    expect(dockerDep).toBeDefined();
    expect(dockerDep.installed).toBe(false);
  });

  test('should detect Docker binary when available', async () => {
    const fs = require('fs');
    const shell = require('shelljs');
    
    fs.existsSync = jest.fn().mockReturnValue(false);
    
    shell.cat = jest.fn().mockReturnValue({
      includes: (_str: string) => false,
      toString: () => ''
    });
    
    shell.which = jest.fn().mockImplementation((cmd: string) => {
      return '/usr/bin/' + cmd; // All binaries available
    });

    const { dependencies } = await import('../src/deps');
    const dockerDep = dependencies.find((d: any) => d.name === 'docker');

    expect(dockerDep).toBeDefined();
    expect(dockerDep.installed).toBe(true);
  });
});
