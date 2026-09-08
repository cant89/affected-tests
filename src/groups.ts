import { DEFAULT_CONFIG } from './config';
import { stripPathPrefix } from './paths';
import type { GroupMatrix, GroupMatrixOptions } from './types';

/**
 * Distribute items across every group with one round-robin pass.
 *
 * @param items - Items to distribute. The list is sorted first, so the result
 * does not depend on the order the caller supplies.
 * @param totalGroups - Number of groups to fill.
 * @returns One array for each group, in group order. A group is empty when
 * there are fewer items than groups.
 * @throws {Error} When `totalGroups` is less than 1.
 */
export function splitAllGroups<T>(items: T[], totalGroups: number): T[][] {
  if (totalGroups < 1) {
    throw new Error(`Invalid group count: ${totalGroups}. Must be at least 1`);
  }

  const sortedItems = [...items].sort();
  const groups: T[][] = Array.from({ length: totalGroups }, () => []);

  sortedItems.forEach((item, index) => {
    groups[index % totalGroups].push(item);
  });

  return groups;
}

/**
 * Split array into groups using round-robin distribution
 *
 * @param array - Array to split
 * @param totalGroups - Total number of groups
 * @param groupIndex - Current group index (0-based)
 * @returns Subset of array for this group
 * @throws {Error} When `groupIndex` is outside the group range.
 */
export function splitIntoGroups<T>(
  array: T[],
  totalGroups: number,
  groupIndex: number
): T[] {
  if (groupIndex >= totalGroups || groupIndex < 0) {
    throw new Error(
      `Invalid group index: ${groupIndex}. Must be between 0 and ${totalGroups - 1}`
    );
  }

  return splitAllGroups(array, totalGroups)[groupIndex];
}

/**
 * Calculate optimal number of groups based on total test count
 *
 * @param totalTests - Total number of tests
 * @param maxTestsPerGroup - Maximum tests per group
 * @param maxGroups - Upper limit on the number of groups. Use 0 for no limit.
 * A limit protects a CI matrix from a change that affects the whole suite,
 * because each group costs one runner. Groups then hold more than
 * `maxTestsPerGroup` tests.
 * @returns Optimal number of groups
 * @throws {Error} When `maxTestsPerGroup` is less than 1.
 */
export function calculateOptimalGroups(
  totalTests: number,
  maxTestsPerGroup: number,
  maxGroups = 0
): number {
  if (maxTestsPerGroup < 1) {
    throw new Error(
      `Invalid maxTestsPerGroup: ${maxTestsPerGroup}. Must be at least 1`
    );
  }

  if (totalTests === 0) return 0;

  const optimalGroups =
    totalTests <= maxTestsPerGroup
      ? 1
      : Math.ceil(totalTests / maxTestsPerGroup);

  if (maxGroups > 0 && optimalGroups > maxGroups) {
    return maxGroups;
  }

  return optimalGroups;
}

/**
 * Get group information for CI matrix generation
 *
 * @param totalTests - Total number of tests
 * @param maxTestsPerGroup - Maximum tests per group
 * @param maxGroups - Upper limit on the number of groups. Use 0 for no limit.
 * @returns The group count and the list of group indices.
 * @deprecated Use {@link buildGroupMatrix}. A matrix of bare indices makes each
 * CI job repeat the git fetch and the dependency analysis to learn its specs.
 */
export function getGroupMatrix(
  totalTests: number,
  maxTestsPerGroup: number,
  maxGroups = 0
): { totalGroups: number; groupIndices: number[] } {
  const totalGroups = calculateOptimalGroups(
    totalTests,
    maxTestsPerGroup,
    maxGroups
  );
  const groupIndices = Array.from({ length: totalGroups }, (_, i) => i);

  return { totalGroups, groupIndices };
}

/**
 * Build a CI matrix that carries the spec list of each group.
 *
 * The matrix lets a CI job start its test runner directly. Without the spec
 * list, each job of the matrix repeats the git fetch and the dependency
 * analysis only to select its own share of the same specs.
 *
 * @param testFiles - Affected test files, with the path prefix still applied.
 * @param options - Group size limits and the path prefix to remove.
 * @returns A matrix with one entry for each non-empty group. `group` is a
 * contiguous label, not an index into a later split, because the entry already
 * carries its specs.
 * @throws {Error} When `maxTestsPerGroup` is less than 1.
 */
export function buildGroupMatrix(
  testFiles: string[],
  options: GroupMatrixOptions = {}
): GroupMatrix {
  const {
    maxTestsPerGroup = DEFAULT_CONFIG.maxTestsPerGroup,
    maxGroups = DEFAULT_CONFIG.maxGroups,
    pathPrefix = DEFAULT_CONFIG.pathPrefix,
  } = options;

  const totalGroups = calculateOptimalGroups(
    testFiles.length,
    maxTestsPerGroup,
    maxGroups
  );

  if (totalGroups === 0) {
    return { include: [] };
  }

  const include = splitAllGroups(testFiles, totalGroups)
    .map((groupFiles) =>
      groupFiles.map((file) => stripPathPrefix(file, pathPrefix))
    )
    .filter((groupFiles) => groupFiles.length > 0)
    .map((groupFiles, group) => ({
      group,
      specs: groupFiles.join(','),
      files: groupFiles,
    }));

  return { include };
}
