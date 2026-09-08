/**
 * Remove the configured path prefix from the start of a file path.
 *
 * The prefix is only removed when the path starts with it. A plain
 * `String.replace` removes the first match anywhere in the path, which
 * corrupts a path that repeats the prefix in a nested directory.
 *
 * @param filePath - Path to strip.
 * @param pathPrefix - Prefix to remove, for example "apps/web/".
 * @returns The path without the prefix, or the path unchanged when it does not
 * start with the prefix.
 */
export function stripPathPrefix(filePath: string, pathPrefix: string): string {
  if (!pathPrefix || !filePath.startsWith(pathPrefix)) {
    return filePath;
  }

  return filePath.slice(pathPrefix.length);
}

/**
 * Add the configured path prefix to a file path.
 *
 * @param filePath - Path to prefix.
 * @param pathPrefix - Prefix to add, for example "apps/web/".
 * @returns The prefixed path, or the path unchanged when no prefix is set.
 */
export function addPathPrefix(filePath: string, pathPrefix: string): string {
  if (!pathPrefix) {
    return filePath;
  }

  return `${pathPrefix}${filePath}`;
}

/**
 * Format test files as the comma-joined spec list that a test runner accepts.
 *
 * @param testFiles - Test file paths, with the path prefix still applied.
 * @param pathPrefix - Prefix to remove from each path.
 * @returns The spec list, for example "src/a.spec.tsx,src/b.spec.tsx".
 */
export function formatSpecs(testFiles: string[], pathPrefix: string): string {
  return testFiles.map((file) => stripPathPrefix(file, pathPrefix)).join(',');
}
