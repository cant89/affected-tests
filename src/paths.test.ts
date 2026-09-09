import { describe, it, expect } from 'vitest';
import { addPathPrefix, formatSpecs, stripPathPrefix } from './paths';

describe('stripPathPrefix', () => {
  it('should remove the prefix from the start of the path', () => {
    expect(stripPathPrefix('apps/web/src/a.spec.tsx', 'apps/web/')).toBe(
      'src/a.spec.tsx'
    );
  });

  it('should only remove the prefix when the path starts with it', () => {
    expect(stripPathPrefix('src/apps/web/a.spec.tsx', 'apps/web/')).toBe(
      'src/apps/web/a.spec.tsx'
    );
  });

  it('should keep a repeated prefix that follows the first one', () => {
    expect(
      stripPathPrefix('apps/web/apps/web/a.spec.tsx', 'apps/web/')
    ).toBe('apps/web/a.spec.tsx');
  });

  it('should return the path unchanged for an empty prefix', () => {
    expect(stripPathPrefix('src/a.spec.tsx', '')).toBe('src/a.spec.tsx');
  });
});

describe('addPathPrefix', () => {
  it('should add the prefix to the path', () => {
    expect(addPathPrefix('src/a.spec.tsx', 'apps/web/')).toBe(
      'apps/web/src/a.spec.tsx'
    );
  });

  it('should return the path unchanged for an empty prefix', () => {
    expect(addPathPrefix('src/a.spec.tsx', '')).toBe('src/a.spec.tsx');
  });
});

describe('formatSpecs', () => {
  it('should strip the prefix and join the specs with a comma', () => {
    const files = ['apps/web/src/a.spec.tsx', 'apps/web/src/b.spec.tsx'];

    expect(formatSpecs(files, 'apps/web/')).toBe(
      'src/a.spec.tsx,src/b.spec.tsx'
    );
  });

  it('should return an empty string for no files', () => {
    expect(formatSpecs([], 'apps/web/')).toBe('');
  });
});
