// Mock the modules before importing anything else
jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

jest.mock('shelljs', () => ({
  cat: jest.fn(),
  which: jest.fn(),
  exec: jest.fn(),
  error: jest.fn()
}));

import { existsSync } from 'fs';
import * as shell from 'shelljs';

// Mock implementations
const mockExistsSync = existsSync as jest.Mock;
const mockShellCat = shell.cat as jest.Mock;
const mockShellWhich = shell.which as jest.Mock;

describe('Docker dependency detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment to original state
    process.env = { ...originalEnv };

    // Explicitly remove any environment variables that could affect tests
    delete process.env.KUBERNETES_SERVICE_HOST;
    delete process.env.STARSHIP_SKIP_DOCKER_CHECK;

    // Set up default mocks
    mockExistsSync.mockReturnValue(false);
    mockShellCat.mockReturnValue({
      includes: (_str: string) => false,
      toString: () => ''
    });
    mockShellWhich.mockImplementation((cmd: string) => {
      if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
      return null;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should detect Docker via .dockerenv file', async () => {
    await jest.isolateModules(async () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/.dockerenv';
      });

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(true);
    });
  });

  test('should detect Docker via cgroup', async () => {
    await jest.isolateModules(async () => {
      mockShellCat.mockReturnValue({
        includes: (str: string) => str === 'docker',
        toString: () => '1:name=systemd:/docker/abc123'
      });

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(true);
    });
  });

  test('should detect Kubernetes pod environment', async () => {
    await jest.isolateModules(async () => {
      process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(true);

      // Clean up
      delete process.env.KUBERNETES_SERVICE_HOST;
    });
  });

  test('should skip Docker check with environment variable', async () => {
    await jest.isolateModules(async () => {
      process.env.STARSHIP_SKIP_DOCKER_CHECK = 'true';

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(true);

      // Clean up
      delete process.env.STARSHIP_SKIP_DOCKER_CHECK;
    });
  });

  test('should require Docker when not in container', async () => {
    await jest.isolateModules(async () => {
      // Ensure we're not detected as running in a container
      mockExistsSync.mockReturnValue(false); // No .dockerenv file
      mockShellCat.mockReturnValue({
        includes: (_str: string) => false, // No docker in cgroup
        toString: () => 'some-other-cgroup-content'
      });
      delete process.env.KUBERNETES_SERVICE_HOST; // Not in Kubernetes
      delete process.env.STARSHIP_SKIP_DOCKER_CHECK; // Don't skip the check

      mockShellWhich.mockImplementation((cmd: string) => {
        if (cmd === 'kubectl' || cmd === 'helm') return '/usr/bin/' + cmd;
        return null; // Docker not installed
      });

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(false);
    });
  });

  test('should detect Docker binary when available', async () => {
    await jest.isolateModules(async () => {
      mockShellWhich.mockImplementation((cmd: string) => {
        return '/usr/bin/' + cmd; // All binaries available
      });

      const { dependencies } = await import('../src/deps');
      const dockerDep = dependencies.find((d: any) => d.name === 'docker');

      expect(dockerDep).toBeDefined();
      expect(dockerDep.installed).toBe(true);
    });
  });
});
