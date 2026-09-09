import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { getChangedFiles } from './git';
import { DEFAULT_CONFIG } from './config';
import { silentLogger } from './config';

vi.mock('child_process', () => ({ execSync: vi.fn() }));

const run = vi.mocked(execSync);

function completeRepositoryError(): Error {
  const error = new Error('Command failed: git fetch --prune --unshallow');
  Object.assign(error, {
    stderr: Buffer.from(
      'fatal: --unshallow on a complete repository does not make sense\n'
    ),
  });

  return error;
}

function fetchCalls(): string[] {
  return run.mock.calls
    .map(([command]) => String(command))
    .filter((command) => command.startsWith('git fetch'));
}

describe('getChangedFiles in CI', () => {
  beforeEach(() => {
    vi.stubEnv('CI', 'true');
    vi.stubEnv('GITHUB_EVENT_NAME', '');
    vi.stubEnv('GITHUB_REF', '');
    run.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockReset();
  });

  it('should fetch the history before it reads the changed files', () => {
    getChangedFiles(DEFAULT_CONFIG, silentLogger);

    expect(fetchCalls()).toEqual([
      'git fetch --prune --unshallow',
      'git fetch origin +refs/heads/*:refs/remotes/origin/*',
    ]);
  });

  it('should not hide a fetch failure behind a shell fallback', () => {
    getChangedFiles(DEFAULT_CONFIG, silentLogger);

    fetchCalls().forEach((command) => expect(command).not.toContain('|| true'));
  });

  it('should continue when the repository already holds its history', () => {
    run.mockImplementation((command) => {
      if (String(command).includes('--unshallow')) {
        throw completeRepositoryError();
      }

      return Buffer.from('');
    });

    expect(() => getChangedFiles(DEFAULT_CONFIG, silentLogger)).not.toThrow();
    expect(fetchCalls()).toHaveLength(2);
  });

  it('should throw when the first fetch fails for another reason', () => {
    run.mockImplementation((command) => {
      if (String(command).includes('--unshallow')) {
        const error = new Error('Command failed');
        Object.assign(error, {
          stderr: Buffer.from('fatal: could not read from remote repository'),
        });
        throw error;
      }

      return Buffer.from('');
    });

    expect(() => getChangedFiles(DEFAULT_CONFIG, silentLogger)).toThrow();
  });

  it('should throw when the branch fetch fails', () => {
    run.mockImplementation((command) => {
      if (String(command).includes('refs/remotes/origin')) {
        throw new Error('Command failed: fatal: no such remote origin');
      }

      return Buffer.from('');
    });

    expect(() => getChangedFiles(DEFAULT_CONFIG, silentLogger)).toThrow();
  });
});

describe('getChangedFiles outside CI', () => {
  beforeEach(() => {
    vi.stubEnv('CI', '');
    vi.stubEnv('GITHUB_EVENT_NAME', '');
    vi.stubEnv('GITHUB_REF', '');
    run.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockReset();
  });

  it('should not fetch', () => {
    getChangedFiles(DEFAULT_CONFIG, silentLogger);

    expect(fetchCalls()).toEqual([]);
  });
});
