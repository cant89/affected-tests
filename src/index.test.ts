import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAffectedTestMatrix, analyzeWithConfig } from './index';
import { resolveConfig } from './config';
import { getChangedFiles } from './git';
import { getDependentFiles } from './dependencies';

vi.mock('./git', () => ({ getChangedFiles: vi.fn() }));
vi.mock('./dependencies', async () => {
  const actual =
    await vi.importActual<typeof import('./dependencies')>('./dependencies');

  return { ...actual, getDependentFiles: vi.fn() };
});

const specs = Array.from(
  { length: 5 },
  (_, i) => `apps/web/src/s${i}.spec.tsx`
);

describe('getAffectedTestMatrix', () => {
  beforeEach(() => {
    vi.mocked(getChangedFiles).mockReturnValue(specs);
    vi.mocked(getDependentFiles).mockResolvedValue([]);
  });

  it('should apply maxTestsPerGroup and pathPrefix from the resolved config', async () => {
    const matrix = await getAffectedTestMatrix({
      maxTestsPerGroup: 2,
      pathPrefix: 'apps/web/',
    });

    expect(matrix.include).toHaveLength(3);
    expect(matrix.include[0].files).toEqual([
      'src/s0.spec.tsx',
      'src/s3.spec.tsx',
    ]);
    expect(
      matrix.include.flatMap((entry) => entry.files)
    ).toHaveLength(5);
  });

  it('should apply the group cap from the resolved config', async () => {
    const matrix = await getAffectedTestMatrix({
      maxTestsPerGroup: 1,
      maxGroups: 2,
      pathPrefix: 'apps/web/',
    });

    expect(matrix.include).toHaveLength(2);
    expect(new Set(matrix.include.flatMap((e) => e.files)).size).toBe(5);
  });

  it('should return an empty include list when no test is affected', async () => {
    vi.mocked(getChangedFiles).mockReturnValue([]);

    expect(await getAffectedTestMatrix({})).toEqual({ include: [] });
  });
});

describe('analyzeWithConfig', () => {
  beforeEach(() => {
    vi.mocked(getChangedFiles).mockReturnValue(specs);
    vi.mocked(getDependentFiles).mockResolvedValue([]);
  });

  it('should read the config file only once for the caller that resolved it', async () => {
    const config = await resolveConfig({ maxTestsPerGroup: 2 });
    const analysis = await analyzeWithConfig(config);

    expect(analysis.allTestFiles).toHaveLength(5);
    expect(analysis.optimalGroups).toBe(3);
  });
});
