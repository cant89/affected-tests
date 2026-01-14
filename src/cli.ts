#!/usr/bin/env node

import { runAffectedTests, getOptimalGroupCount, analyzeAffectedTests, consoleLogger } from './index';
import type { PartialConfig, RunOptions } from './types';

interface CLIArgs {
  command: 'run' | 'analyze' | 'groups' | 'help' | 'version';
  config?: string;
  srcDir?: string;
  baseDir?: string;
  pathPrefix?: string;
  baseBranch?: string;
  testCommand?: string;
  testFilePattern?: string;
  maxTestsPerGroup?: number;
  groupIndex?: number;
  totalGroups?: number;
  verbose?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

function printHelp(): void {
  console.log(`
affected-tests - Run only tests affected by your changes

USAGE:
  affected-tests [command] [options]

COMMANDS:
  run       Run affected tests (default)
  analyze   Analyze affected tests without running
  groups    Output optimal number of groups for CI matrix

OPTIONS:
  --config <path>           Path to config file
  --src-dir <path>          Source directory (default: ./src)
  --base-dir <path>         Base directory (default: cwd)
  --path-prefix <prefix>    Path prefix for monorepos (e.g., "apps/web/")
  --base-branch <branch>    Base branch to compare (default: master)
  --test-command <cmd>      Test command template (use {specs} placeholder)
  --test-pattern <regex>    Test file pattern (default: \\.spec\\.(ts|tsx|js|jsx)$)
  --max-tests <n>           Max tests per group (default: 20)
  --group <n>               Group index (0-based) for parallel execution
  --total-groups <n>        Total number of groups
  --verbose                 Enable verbose output
  --dry-run                 Show what would run without executing
  --json                    Output results as JSON (for analyze command)
  --help, -h                Show this help message
  --version, -v             Show version

EXAMPLES:
  # Run all affected tests
  affected-tests run

  # Run tests for group 0 of 3
  affected-tests run --group 0 --total-groups 3

  # Analyze without running
  affected-tests analyze --json

  # Get optimal group count for CI
  affected-tests groups

  # Use custom test command
  affected-tests run --test-command 'npx jest {specs}'

CONFIG FILE:
  Create affected-tests.config.js in your project root:

  module.exports = {
    srcDir: './src',
    pathPrefix: 'apps/web/',
    baseBranch: 'main',
    testCommand: 'npx cypress run --component --spec "{specs}"',
    testFilePattern: '\\.spec\\.(ts|tsx)$',
    maxTestsPerGroup: 20,
  };
`);
}

function printVersion(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../package.json');
  console.log(`affected-tests v${pkg.version}`);
}

function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = { command: 'run' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case 'run':
      case 'analyze':
      case 'groups':
        result.command = arg;
        break;
      case 'help':
      case '--help':
      case '-h':
        result.command = 'help';
        break;
      case 'version':
      case '--version':
      case '-v':
        result.command = 'version';
        break;
      case '--config':
        result.config = nextArg;
        i++;
        break;
      case '--src-dir':
        result.srcDir = nextArg;
        i++;
        break;
      case '--base-dir':
        result.baseDir = nextArg;
        i++;
        break;
      case '--path-prefix':
        result.pathPrefix = nextArg;
        i++;
        break;
      case '--base-branch':
        result.baseBranch = nextArg;
        i++;
        break;
      case '--test-command':
        result.testCommand = nextArg;
        i++;
        break;
      case '--test-pattern':
        result.testFilePattern = nextArg;
        i++;
        break;
      case '--max-tests':
        result.maxTestsPerGroup = parseInt(nextArg, 10);
        i++;
        break;
      case '--group':
        result.groupIndex = parseInt(nextArg, 10);
        i++;
        break;
      case '--total-groups':
        result.totalGroups = parseInt(nextArg, 10);
        i++;
        break;
      case '--verbose':
        result.verbose = true;
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--json':
        result.json = true;
        break;
    }
  }

  return result;
}

function buildConfigFromArgs(args: CLIArgs): PartialConfig & { configPath?: string } {
  const config: PartialConfig & { configPath?: string } = {};

  if (args.config) config.configPath = args.config;
  if (args.srcDir) config.srcDir = args.srcDir;
  if (args.baseDir) config.baseDir = args.baseDir;
  if (args.pathPrefix) config.pathPrefix = args.pathPrefix;
  if (args.baseBranch) config.baseBranch = args.baseBranch;
  if (args.testCommand) config.testCommand = args.testCommand;
  if (args.testFilePattern) config.testFilePattern = new RegExp(args.testFilePattern);
  if (args.maxTestsPerGroup) config.maxTestsPerGroup = args.maxTestsPerGroup;
  if (args.verbose) config.verbose = args.verbose;

  return config;
}

function buildRunOptions(args: CLIArgs): RunOptions {
  const options: RunOptions = {};

  if (args.groupIndex !== undefined) options.groupIndex = args.groupIndex;
  if (args.totalGroups !== undefined) options.totalGroups = args.totalGroups;
  if (args.dryRun) options.dryRun = args.dryRun;

  return options;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  try {
    switch (args.command) {
      case 'help':
        printHelp();
        process.exit(0);
        break;

      case 'version':
        printVersion();
        process.exit(0);
        break;

      case 'groups': {
        const config = buildConfigFromArgs(args);
        const groups = await getOptimalGroupCount(config);
        console.log(groups);
        break;
      }

      case 'analyze': {
        const config = buildConfigFromArgs(args);
        const result = await analyzeAffectedTests(
          config,
          args.json ? { log: () => {}, error: console.error, debug: () => {} } : consoleLogger
        );

        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n📊 Analysis Results');
          console.log('-------------------');
          console.log(`Changed files: ${result.changedFiles.length}`);
          console.log(`Changed test files: ${result.changedTestFiles.length}`);
          console.log(`Dependent test files: ${result.dependentTestFiles.length}`);
          console.log(`Total test files: ${result.allTestFiles.length}`);
          console.log(`Optimal groups: ${result.optimalGroups}`);

          if (result.allTestFiles.length > 0) {
            console.log('\nTest files to run:');
            result.allTestFiles.forEach((file) => console.log(`  - ${file}`));
          }
        }
        break;
      }

      case 'run':
      default: {
        const config = buildConfigFromArgs(args);
        const runOptions = buildRunOptions(args);
        await runAffectedTests(config, runOptions, consoleLogger);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
