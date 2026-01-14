import type {
  Config,
  PartialConfig,
  AnalysisResult,
  RunOptions,
  Logger,
} from './types';
import { resolveConfig, consoleLogger, silentLogger, createLogger, DEFAULT_CONFIG } from './config';
import { getChangedFiles } from './git';
import { getDependentFiles, isTestFile } from './dependencies';
import { splitIntoGroups, calculateOptimalGroups, getGroupMatrix } from './groups';
import { runTests } from './runner';

// Re-export types
export type {
  Config,
  PartialConfig,
  AnalysisResult,
  RunOptions,
  Logger,
  DependentFile,
} from './types';

// Re-export utilities
export { DEFAULT_CONFIG, resolveConfig, consoleLogger, silentLogger, createLogger } from './config';
export { splitIntoGroups, calculateOptimalGroups, getGroupMatrix } from './groups';
export { isTestFile } from './dependencies';

/**
 * Analyze which tests are affected by changes in the current branch
 */
export async function analyzeAffectedTests(
  options: PartialConfig & { configPath?: string } = {},
  customLogger?: Logger
): Promise<AnalysisResult> {
  const config = await resolveConfig(options);
  const logger = customLogger || createLogger(config.verbose);

  if (config.verbose) {
    logger.debug('📋 Configuration:');
    // Convert RegExp to string for readable output
    const configForLog = {
      ...config,
      testFilePattern: config.testFilePattern.toString(),
      excludePatterns: config.excludePatterns.map((p) => p.toString()),
    };
    logger.debug(JSON.stringify(configForLog, null, 2));
  }

  // Get changed files from git
  const changedFiles = getChangedFiles(config, logger);

  if (changedFiles.length === 0) {
    return {
      changedFiles: [],
      changedTestFiles: [],
      dependentTestFiles: [],
      allTestFiles: [],
      optimalGroups: 0,
    };
  }

  if (config.verbose) {
    logger.log('\n📋 Changed Files:');
    changedFiles.forEach((file) => logger.log(`  - ${file}`));
  }

  // Get test files that depend on changed files
  logger.debug('\n🔍 Analyzing Dependencies...');
  const dependentTestFiles = await getDependentFiles(changedFiles, config, logger);

  // Get test files that were directly changed
  const changedTestFiles = changedFiles.filter((file) =>
    isTestFile(file, config.testFilePattern)
  );

  // Log dependency chains if verbose
  if (config.verbose && dependentTestFiles.length > 0) {
    logger.log('\n🔗 Dependent Test Files and Their Import Chains:');
    logger.log('------------------------------------------------');
    dependentTestFiles.forEach(({ file, chain }) => {
      const chainDescription = chain
        .map((f, i) => {
          if (i === 0) return `changed file: ${f}`;
          if (i === chain.length - 1) return `test file: ${f}`;
          return f;
        })
        .join('\n    → ');
      logger.log(`\n📄 ${file}`);
      logger.log(`  🔄 because:\n    ${chainDescription}`);
    });
  }

  if (config.verbose && changedTestFiles.length > 0) {
    logger.log('\n📝 Directly Changed Test Files:');
    logger.log('-------------------------------');
    changedTestFiles.forEach((file) => logger.log(`  - ${file}`));
  }

  // Combine and dedupe
  const allTestFiles = [
    ...new Set([
      ...dependentTestFiles.map(({ file }) => file),
      ...changedTestFiles,
    ]),
  ];

  const optimalGroups = calculateOptimalGroups(
    allTestFiles.length,
    config.maxTestsPerGroup
  );

  return {
    changedFiles,
    changedTestFiles,
    dependentTestFiles,
    allTestFiles,
    optimalGroups,
  };
}

/**
 * Run affected tests
 */
export async function runAffectedTests(
  options: PartialConfig & { configPath?: string } = {},
  runOptions: RunOptions = {},
  customLogger?: Logger
): Promise<void> {
  const config = await resolveConfig(options);
  const logger = customLogger || createLogger(config.verbose);
  const analysis = await analyzeAffectedTests(options, logger);

  if (analysis.allTestFiles.length === 0) {
    logger.log('\nℹ️ No affected test files found');
    return;
  }

  // Log summary
  logger.log('\n📊 Summary');
  logger.log('---------');
  logger.log(`Changed files: ${analysis.changedFiles.length}`);
  logger.log(`Changed test files: ${analysis.changedTestFiles.length}`);
  logger.log(`Dependent test files: ${analysis.dependentTestFiles.length}`);
  logger.log(`Total test files to run: ${analysis.allTestFiles.length}`);

  // Determine which tests to run based on group options
  let testsToRun = analysis.allTestFiles;

  if (runOptions.groupIndex !== undefined && runOptions.totalGroups) {
    testsToRun = splitIntoGroups(
      analysis.allTestFiles,
      runOptions.totalGroups,
      runOptions.groupIndex
    );

    logger.log(`\n📦 Group ${runOptions.groupIndex + 1} of ${runOptions.totalGroups}`);
    logger.log('---------');
    logger.log(
      `Running ${testsToRun.length} of ${analysis.allTestFiles.length} total tests`
    );
  }

  if (testsToRun.length === 0) {
    logger.log('\nℹ️ No test files to run in this group');
    return;
  }

  // Log dependency chains if verbose
  if (config.verbose && analysis.dependentTestFiles.length > 0) {
    logger.log('\n🔗 Dependency Chains:');
    analysis.dependentTestFiles.forEach(({ file, chain }) => {
      const chainDescription = chain
        .map((f, i) => {
          if (i === 0) return `changed: ${f}`;
          if (i === chain.length - 1) return `test: ${f}`;
          return f;
        })
        .join(' → ');
      logger.log(`  ${file}`);
      logger.log(`    └─ ${chainDescription}`);
    });
  }

  // Run the tests
  runTests(testsToRun, config, logger, runOptions.dryRun);
}

/**
 * Get the optimal number of groups for CI matrix
 * Outputs only the number for easy capture in CI scripts
 */
export async function getOptimalGroupCount(
  options: PartialConfig & { configPath?: string } = {},
  logger: Logger = silentLogger
): Promise<number> {
  const analysis = await analyzeAffectedTests(options, logger);
  return analysis.optimalGroups;
}

/**
 * Main entry point for programmatic usage
 */
export default {
  analyzeAffectedTests,
  runAffectedTests,
  getOptimalGroupCount,
  splitIntoGroups,
  calculateOptimalGroups,
  getGroupMatrix,
  resolveConfig,
  DEFAULT_CONFIG,
};
