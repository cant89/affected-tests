import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, normalizeConfigPatterns } from './config';

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
