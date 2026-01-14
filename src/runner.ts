import { execSync } from 'child_process';
import type { Config, Logger } from './types';

/**
 * Build the test command from the template
 */
function buildCommand(
  testFiles: string[],
  config: Config
): string {
  // Remove path prefix from test files if configured
  const relativePaths = testFiles.map((file) =>
    config.pathPrefix ? file.replace(config.pathPrefix, '') : file
  );

  // Join with comma (common format for most test runners)
  const specs = relativePaths.join(',');

  // Replace the {specs} placeholder
  return config.testCommand.replace('{specs}', specs);
}

/**
 * Run tests for the given test files
 */
export function runTests(
  testFiles: string[],
  config: Config,
  logger: Logger,
  dryRun = false
): void {
  try {
    if (!Array.isArray(testFiles) || testFiles.length === 0) {
      logger.log('ℹ️ No test files to run');
      return;
    }

    logger.log('\n📋 Test Files to Run');
    logger.log('-----------------');
    testFiles.forEach((file) => logger.log(`- ${file}`));

    const command = buildCommand(testFiles, config);

    logger.log('\n⚙️  Test Command');
    logger.log('---------------');
    logger.log(command);

    if (dryRun) {
      logger.log('\n🔍 Dry run mode - command not executed');
      return;
    }

    logger.log('\n🚀 Running Tests');
    logger.log('----------------');

    execSync(command, { stdio: 'inherit' });

    logger.log('\n✅ Tests completed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`\n❌ Error running tests: ${message}`);
    throw error;
  }
}
