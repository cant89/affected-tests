import { describe, it, expect } from 'vitest';
import {
  buildGroupMatrix,
  splitAllGroups,
  splitIntoGroups,
  calculateOptimalGroups,
  getGroupMatrix,
} from './groups';

describe('splitIntoGroups', () => {
  it('should split array into groups using round-robin', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    const group0 = splitIntoGroups(items, 3, 0);
    const group1 = splitIntoGroups(items, 3, 1);
    const group2 = splitIntoGroups(items, 3, 2);

    // Round-robin: sorted items are [a,b,c,d,e,f,g]
    // Group 0: indices 0,3,6 -> a,d,g
    // Group 1: indices 1,4 -> b,e
    // Group 2: indices 2,5 -> c,f
    expect(group0).toEqual(['a', 'd', 'g']);
    expect(group1).toEqual(['b', 'e']);
    expect(group2).toEqual(['c', 'f']);
  });

  it('should ensure all items are covered with no duplicates', () => {
    const items = ['test1', 'test2', 'test3', 'test4', 'test5'];

    const allGroups = [
      ...splitIntoGroups(items, 3, 0),
      ...splitIntoGroups(items, 3, 1),
      ...splitIntoGroups(items, 3, 2),
    ].sort();

    expect(allGroups).toEqual([...items].sort());
  });

  it('should handle fewer items than groups', () => {
    const items = ['a', 'b'];

    expect(splitIntoGroups(items, 5, 0)).toEqual(['a']);
    expect(splitIntoGroups(items, 5, 1)).toEqual(['b']);
    expect(splitIntoGroups(items, 5, 2)).toEqual([]);
    expect(splitIntoGroups(items, 5, 3)).toEqual([]);
  });

  it('should throw for invalid group index', () => {
    const items = ['a', 'b', 'c'];

    expect(() => splitIntoGroups(items, 3, -1)).toThrow('Invalid group index');
    expect(() => splitIntoGroups(items, 3, 3)).toThrow('Invalid group index');
    expect(() => splitIntoGroups(items, 3, 10)).toThrow('Invalid group index');
  });

  it('should handle single group', () => {
    const items = ['a', 'b', 'c'];
    expect(splitIntoGroups(items, 1, 0)).toEqual(['a', 'b', 'c']);
  });

  it('should sort items for consistent distribution', () => {
    const items = ['z', 'a', 'm'];
    const result = splitIntoGroups(items, 1, 0);
    expect(result).toEqual(['a', 'm', 'z']);
  });
});

describe('calculateOptimalGroups', () => {
  it('should return 0 for 0 tests', () => {
    expect(calculateOptimalGroups(0, 20)).toBe(0);
  });

  it('should return 1 for tests <= maxPerGroup', () => {
    expect(calculateOptimalGroups(5, 20)).toBe(1);
    expect(calculateOptimalGroups(20, 20)).toBe(1);
  });

  it('should calculate correct number of groups', () => {
    expect(calculateOptimalGroups(21, 20)).toBe(2);
    expect(calculateOptimalGroups(40, 20)).toBe(2);
    expect(calculateOptimalGroups(41, 20)).toBe(3);
    expect(calculateOptimalGroups(100, 20)).toBe(5);
  });

  it('should work with custom maxPerGroup', () => {
    expect(calculateOptimalGroups(30, 10)).toBe(3);
    expect(calculateOptimalGroups(100, 25)).toBe(4);
  });
});

describe('getGroupMatrix', () => {
  it('should return correct matrix info', () => {
    const result = getGroupMatrix(50, 20);

    expect(result.totalGroups).toBe(3);
    expect(result.groupIndices).toEqual([0, 1, 2]);
  });

  it('should handle 0 tests', () => {
    const result = getGroupMatrix(0, 20);

    expect(result.totalGroups).toBe(0);
    expect(result.groupIndices).toEqual([]);
  });
});

/**
 * The round-robin distribution as it stood before splitAllGroups existed.
 *
 * splitIntoGroups now delegates to splitAllGroups, so comparing the two would
 * compare splitAllGroups with itself. This independent copy is what makes the
 * equivalence claim testable.
 *
 * @param array - Items to distribute.
 * @param totalGroups - Total number of groups.
 * @param groupIndex - Group to return, 0-based.
 * @returns The items of that group.
 */
function legacySplitIntoGroups<T>(
  array: T[],
  totalGroups: number,
  groupIndex: number
): T[] {
  const sortedArray = [...array].sort();
  const result: T[] = [];

  for (let i = groupIndex; i < sortedArray.length; i += totalGroups) {
    result.push(sortedArray[i]);
  }

  return result;
}

describe('splitAllGroups', () => {
  it('should distribute every item round-robin in one pass', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    expect(splitAllGroups(items, 3)).toEqual([
      ['a', 'd', 'g'],
      ['b', 'e'],
      ['c', 'f'],
    ]);
  });

  it('should match the pre-refactor round-robin for every group', () => {
    const items = ['e', 'a', 'd', 'b', 'c'];
    const all = splitAllGroups(items, 3);

    all.forEach((group, index) =>
      expect(group).toEqual(legacySplitIntoGroups(items, 3, index))
    );
  });

  it('should distribute a shuffled input to a fixed partition', () => {
    expect(splitAllGroups(['e', 'a', 'd', 'b', 'c'], 3)).toEqual([
      ['a', 'd'],
      ['b', 'e'],
      ['c'],
    ]);
  });

  it('should throw for a non-integer group count', () => {
    expect(() => splitAllGroups(['a'], Number.NaN)).toThrow(
      'Invalid group count'
    );
    expect(() => splitAllGroups(['a'], 2.5)).toThrow('Invalid group count');
  });

  it('should return empty groups when there are fewer items than groups', () => {
    expect(splitAllGroups(['a', 'b'], 4)).toEqual([['a'], ['b'], [], []]);
  });

  it('should throw for a group count below 1', () => {
    expect(() => splitAllGroups(['a'], 0)).toThrow('Invalid group count');
  });
});

describe('calculateOptimalGroups with a cap', () => {
  it('should not exceed the cap', () => {
    expect(calculateOptimalGroups(332, 10, 12)).toBe(12);
  });

  it('should keep the optimal count when it is below the cap', () => {
    expect(calculateOptimalGroups(25, 10, 12)).toBe(3);
  });

  it('should not cap when the limit is 0', () => {
    expect(calculateOptimalGroups(332, 10, 0)).toBe(34);
  });

  it('should throw for a maximum group size below 1', () => {
    expect(() => calculateOptimalGroups(10, 0)).toThrow(
      'Invalid maxTestsPerGroup'
    );
  });

  it('should throw for a non-integer maximum group size', () => {
    expect(() => calculateOptimalGroups(10, Number.NaN)).toThrow(
      'Invalid maxTestsPerGroup'
    );
    expect(() => calculateOptimalGroups(10, 2.5)).toThrow(
      'Invalid maxTestsPerGroup'
    );
  });

  it('should throw for a non-integer or negative cap', () => {
    expect(() => calculateOptimalGroups(10, 5, Number.NaN)).toThrow(
      'Invalid maxGroups'
    );
    expect(() => calculateOptimalGroups(10, 5, -1)).toThrow('Invalid maxGroups');
  });
});

describe('buildGroupMatrix', () => {
  it('should return an empty include list for no test files', () => {
    expect(buildGroupMatrix([], { maxTestsPerGroup: 10 })).toEqual({
      include: [],
    });
  });

  it('should return one group when the count is at or below the maximum', () => {
    const files = ['apps/web/src/a.spec.tsx', 'apps/web/src/b.spec.tsx'];

    const matrix = buildGroupMatrix(files, {
      maxTestsPerGroup: 10,
      pathPrefix: 'apps/web/',
    });

    expect(matrix.include).toEqual([
      { group: 0, files: ['src/a.spec.tsx', 'src/b.spec.tsx'] },
    ]);
  });

  it('should split 25 files with a maximum of 10 into 3 groups', () => {
    const files = Array.from(
      { length: 25 },
      (_, i) => `apps/web/src/spec-${String(i).padStart(2, '0')}.spec.tsx`
    );

    const matrix = buildGroupMatrix(files, {
      maxTestsPerGroup: 10,
      pathPrefix: 'apps/web/',
    });

    expect(matrix.include).toHaveLength(3);
    expect(matrix.include.map((entry) => entry.files.length)).toEqual([9, 8, 8]);
  });

  it('should cover every file once', () => {
    const files = Array.from(
      { length: 25 },
      (_, i) => `apps/web/src/spec-${String(i).padStart(2, '0')}.spec.tsx`
    );

    const covered = buildGroupMatrix(files, {
      maxTestsPerGroup: 10,
      pathPrefix: 'apps/web/',
    }).include.flatMap((entry) => entry.files);

    expect(covered).toHaveLength(25);
    expect(new Set(covered).size).toBe(25);
  });

  it('should respect the group cap', () => {
    const files = Array.from(
      { length: 100 },
      (_, i) => `src/spec-${String(i).padStart(3, '0')}.spec.tsx`
    );

    const matrix = buildGroupMatrix(files, {
      maxTestsPerGroup: 10,
      maxGroups: 4,
    });

    expect(matrix.include).toHaveLength(4);
    expect(matrix.include.map((entry) => entry.files.length)).toEqual([
      25, 25, 25, 25,
    ]);
  });

  it('should not emit a group with an empty file list', () => {
    const matrix = buildGroupMatrix(['src/a.spec.tsx'], {
      maxTestsPerGroup: 10,
    });

    expect(matrix.include).toHaveLength(1);
    matrix.include.forEach((entry) =>
      expect(entry.files.length).toBeGreaterThan(0)
    );
  });

  it('should cover every file once when the cap forces uneven groups', () => {
    const files = Array.from({ length: 10 }, (_, i) => `src/s${i}.spec.tsx`);

    const matrix = buildGroupMatrix(files, {
      maxTestsPerGroup: 2,
      maxGroups: 3,
    });

    expect(matrix.include.map((entry) => entry.files.length)).toEqual([4, 3, 3]);
    expect(new Set(matrix.include.flatMap((entry) => entry.files)).size).toBe(
      10
    );
  });

  it('should throw for a non-integer maximum group size', () => {
    expect(() =>
      buildGroupMatrix(['src/a.spec.tsx'], { maxTestsPerGroup: Number.NaN })
    ).toThrow('Invalid maxTestsPerGroup');
  });

  it('should give each group a contiguous label', () => {
    const files = Array.from({ length: 7 }, (_, i) => `src/s${i}.spec.tsx`);

    const matrix = buildGroupMatrix(files, { maxTestsPerGroup: 2 });

    expect(matrix.include.map((entry) => entry.group)).toEqual([0, 1, 2, 3]);
  });
});
