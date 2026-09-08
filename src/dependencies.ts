import * as path from 'path';
import madge from 'madge';
import { addPathPrefix, stripPathPrefix } from './paths';
import type { Config, DependentFile, Logger } from './types';

/**
 * Build madge configuration from our config
 */
function buildMadgeConfig(config: Config): Record<string, unknown> {
  return {
    fileExtensions: config.fileExtensions,
    tsConfig: config.tsConfigPath,
    baseDir: config.baseDir,
    excludeRegExp: config.excludePatterns,
    detectiveOptions: {
      ts: {
        skipTypeImports: config.skipTypeImports,
      },
    },
  };
}

/**
 * Check if a file matches the test file pattern
 */
export function isTestFile(filePath: string, pattern: RegExp): boolean {
  return pattern.test(filePath);
}

/**
 * Get all files that depend on the changed files
 *
 * NOTE: This function doesn't detect named imports, therefore:
 * - If a file exports 2 or more methods and only one is changed,
 *   it can't recognize if the importer is using the changed method or not
 * - If a barrel file X re-exports files A and B, and file C imports A through X,
 *   this function will recognize C as dependent on both A and B
 */
export async function getDependentFiles(
  changedFiles: string[],
  config: Config,
  logger: Logger
): Promise<DependentFile[]> {
  try {
    const srcPath = path.resolve(config.baseDir, config.srcDir);
    const madgeConfig = buildMadgeConfig(config);

    logger.debug(`📦 Analyzing dependencies in: ${srcPath}`);

    const dependencyTree = await madge(srcPath, madgeConfig);

    const allDependentFiles = new Map<string, string[]>();
    const processedFiles = new Set<string>();

    async function findDependencies(
      filePath: string,
      chain: string[] = []
    ): Promise<void> {
      if (processedFiles.has(filePath)) {
        return;
      }

      processedFiles.add(filePath);

      // Remove path prefix to get the relative path for madge lookup
      const relativePath = stripPathPrefix(filePath, config.pathPrefix);
      const dependencies = dependencyTree.depends(relativePath);

      await Promise.all(
        dependencies.map(async (dep) => {
          const fullPath = addPathPrefix(dep, config.pathPrefix);
          const newChain = [...chain, filePath];
          allDependentFiles.set(fullPath, newChain);
          await findDependencies(fullPath, newChain);
        })
      );
    }

    for (const changedFile of changedFiles) {
      await findDependencies(changedFile);
    }

    // Filter to only test files and format the result
    return Array.from(allDependentFiles.entries())
      .filter(([file]) => isTestFile(file, config.testFilePattern))
      .map(([file, chain]) => ({
        file,
        chain: [...chain, file],
      }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Error analyzing dependencies: ${message}`);
    throw error;
  }
}
