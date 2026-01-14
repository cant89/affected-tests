import { describe, it, expect } from 'vitest';
import { splitIntoGroups, calculateOptimalGroups, getGroupMatrix } from './groups';

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
