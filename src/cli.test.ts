import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, buildConfigFromArgs, main } from './cli';
import { getAffectedTestMatrix } from './index';

vi.mock('./index', async () => {
  const actual = await vi.importActual<typeof import('./index')>('./index');

  return {
    ...actual,
    getAffectedTestMatrix: vi.fn(),
    analyzeAffectedTests: vi.fn(),
    getOptimalGroupCount: vi.fn(),
    runAffectedTests: vi.fn(),
  };
});

describe('parseArgs', () => {
  it('should read the matrix command and the group cap', () => {
    const args = parseArgs(['matrix', '--max-groups', '12']);

    expect(args.command).toBe('matrix');
    expect(args.maxGroups).toBe(12);
  });
});

describe('buildConfigFromArgs', () => {
  it('should keep a group cap of 0', () => {
    expect(buildConfigFromArgs(parseArgs(['matrix', '--max-groups', '0'])))
      .toHaveProperty('maxGroups', 0);
  });

  it('should throw for a non-numeric group cap', () => {
    expect(() =>
      buildConfigFromArgs(parseArgs(['matrix', '--max-groups', 'abc']))
    ).toThrow('Invalid --max-groups value');
  });

  it('should throw for a negative group cap', () => {
    expect(() =>
      buildConfigFromArgs(parseArgs(['matrix', '--max-groups', '-1']))
    ).toThrow('Invalid --max-groups value');
  });
});

describe('the matrix command', () => {
  const matrix = {
    include: [{ group: 0, specs: 'src/a.spec.ts', files: ['src/a.spec.ts'] }],
  };
  let stdout: string[];
  let stderr: string[];

  beforeEach(() => {
    stdout = [];
    stderr = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    vi.spyOn(console, 'log').mockImplementation((...parts) => {
      stdout.push(parts.join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...parts) => {
      stderr.push(parts.join(' '));
    });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getAffectedTestMatrix).mockReset();
  });

  it('should write exactly one JSON line to stdout', async () => {
    vi.mocked(getAffectedTestMatrix).mockResolvedValue(matrix);
    process.argv = ['node', 'cli.js', 'matrix'];

    await main();

    expect(stdout).toHaveLength(1);
    expect(stdout[0].endsWith('\n')).toBe(true);
    expect(JSON.parse(stdout[0])).toEqual(matrix);
  });

  it('should keep stdout a single JSON line when verbose', async () => {
    vi.mocked(getAffectedTestMatrix).mockImplementation(async (_o, logger) => {
      logger?.log('analyzing');
      logger?.debug('done');
      return matrix;
    });
    process.argv = ['node', 'cli.js', 'matrix', '--verbose'];

    await main();

    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0])).toEqual(matrix);
    expect(stderr.join('')).toContain('analyzing');
  });

  it('should exit 1 and write nothing to stdout when the analysis fails', async () => {
    vi.mocked(getAffectedTestMatrix).mockRejectedValue(new Error('git failed'));
    process.argv = ['node', 'cli.js', 'matrix'];

    await expect(main()).rejects.toThrow('exit:1');
    expect(stdout).toHaveLength(0);
    expect(stderr.join('')).toContain('git failed');
  });
});
