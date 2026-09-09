import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_CONFIG, normalizeConfigPatterns, resolveConfig } from './config';

describe('normalizeConfigPatterns', () => {
  it('should convert a testFilePattern string to a RegExp', () => {
    const result = normalizeConfigPatterns({
      testFilePattern: '\\.spec\\.(ts|tsx)$',
    });

    expect(result.testFilePattern).toBeInstanceOf(RegExp);
    expect(result.testFilePattern?.test('src/a.spec.tsx')).toBe(true);
    expect(result.testFilePattern?.test('src/a.ts')).toBe(false);
  });

  it('should convert excludePattern strings to RegExp', () => {
    const result = normalizeConfigPatterns({
      excludePatterns: ['node_modules', 'graphql/types'],
    });

    expect(result.excludePatterns).toHaveLength(2);
    result.excludePatterns?.forEach((pattern) =>
      expect(pattern).toBeInstanceOf(RegExp)
    );
  });

  it('should keep a pattern that is already a RegExp', () => {
    const pattern = /node_modules/;
    const result = normalizeConfigPatterns({ excludePatterns: [pattern] });

    expect(result.excludePatterns?.[0]).toBe(pattern);
  });

  it('should return the other keys unchanged', () => {
    const result = normalizeConfigPatterns({
      pathPrefix: 'apps/web/',
      maxTestsPerGroup: 10,
    });

    expect(result.pathPrefix).toBe('apps/web/');
    expect(result.maxTestsPerGroup).toBe(10);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should not cap the number of groups', () => {
    expect(DEFAULT_CONFIG.maxGroups).toBe(0);
  });
});

describe('resolveConfig with a JS config file', () => {
  const tempDirs: string[] = [];

  function writeConfig(source: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'affected-tests-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'affected-tests.config.js');
    fs.writeFileSync(file, source);

    return file;
  }

  afterEach(() => {
    tempDirs.splice(0).forEach((dir) =>
      fs.rmSync(dir, { recursive: true, force: true })
    );
  });

  it('should convert string patterns of a JS config to RegExp', async () => {
    const configPath = writeConfig(
      `module.exports = {
        pathPrefix: 'apps/web/',
        excludePatterns: ['node_modules', 'graphql/types'],
        testFilePattern: '\\\\.spec\\\\.(ts|tsx)$',
      };`
    );

    const config = await resolveConfig({ configPath });

    expect(config.pathPrefix).toBe('apps/web/');
    expect(config.testFilePattern).toBeInstanceOf(RegExp);
    expect(config.testFilePattern.test('src/a.spec.tsx')).toBe(true);
    config.excludePatterns.forEach((pattern) =>
      expect(pattern).toBeInstanceOf(RegExp)
    );
  });

  it('should keep a RegExp pattern of a JS config', async () => {
    const configPath = writeConfig(
      'module.exports = { excludePatterns: [/node_modules/] };'
    );

    const config = await resolveConfig({ configPath });

    expect(config.excludePatterns[0]).toBeInstanceOf(RegExp);
    expect(config.excludePatterns[0].source).toBe('node_modules');
  });
});
