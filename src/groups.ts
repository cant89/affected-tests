/**
 * Split array into groups using round-robin distribution
 *
 * @param array - Array to split
 * @param totalGroups - Total number of groups
 * @param groupIndex - Current group index (0-based)
 * @returns Subset of array for this group
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

  // Sort for consistent distribution (if strings)
  const sortedArray = [...array].sort();
  const result: T[] = [];

  // Round-robin distribution: group 0 gets indices 0,3,6..., group 1 gets 1,4,7..., etc.
  for (let i = groupIndex; i < sortedArray.length; i += totalGroups) {
    result.push(sortedArray[i]);
  }

  return result;
}

/**
 * Calculate optimal number of groups based on total test count
 *
 * @param totalTests - Total number of tests
 * @param maxTestsPerGroup - Maximum tests per group
 * @returns Optimal number of groups
 */
export function calculateOptimalGroups(
  totalTests: number,
  maxTestsPerGroup: number
): number {
  if (totalTests === 0) return 0;
  if (totalTests <= maxTestsPerGroup) return 1;
  return Math.ceil(totalTests / maxTestsPerGroup);
}

/**
 * Get group information for CI matrix generation
 */
export function getGroupMatrix(
  totalTests: number,
  maxTestsPerGroup: number
): { totalGroups: number; groupIndices: number[] } {
  const totalGroups = calculateOptimalGroups(totalTests, maxTestsPerGroup);
  const groupIndices = Array.from({ length: totalGroups }, (_, i) => i);

  return { totalGroups, groupIndices };
}
