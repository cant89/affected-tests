/**
 * Configuration options for affected-test-runner
 */
export interface Config {
  /**
   * Source directory to analyze for dependencies
   * @default "./src"
   */
  srcDir: string;

  /**
   * Base directory for the project (where tsconfig.json is located)
   * @default process.cwd()
   */
  baseDir: string;

  /**
   * Path prefix to add to file paths (e.g., "apps/web/")
   * Useful in monorepos where files are in a subdirectory
   * @default ""
   */
  pathPrefix: string;

  /**
   * The base branch to compare against
   * @default "master"
   */
  baseBranch: string;

  /**
   * Regex pattern to identify test files
   * @default /\.spec\.(ts|tsx|js|jsx)$/
   */
  testFilePattern: RegExp;

  /**
   * File extensions to analyze
   * @default ["ts", "tsx", "js", "jsx"]
   */
  fileExtensions: string[];

  /**
   * Path to tsconfig.json relative to baseDir
   * @default "tsconfig.json"
   */
  tsConfigPath: string;

  /**
   * Regex patterns to exclude from dependency analysis
   * @default [/node_modules/]
   */
  excludePatterns: RegExp[];

  /**
   * Command template to run tests. Use {specs} as placeholder for test files.
   * @example "npx cypress run --component --spec \"{specs}\""
   * @example "npx jest {specs}"
   * @example "npx vitest run {specs}"
   */
  testCommand: string;

  /**
   * Maximum number of tests per group when using parallel execution
   * @default 20
   */
  maxTestsPerGroup: number;

  /**
   * Upper limit on the number of groups. Use 0 for no limit.
   * A limit protects a CI matrix from a change that affects the whole suite,
   * because each group costs one runner.
   * @default 0
   */
  maxGroups: number;

  /**
   * Whether to skip TypeScript type imports during dependency analysis
   * @default true
   */
  skipTypeImports: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose: boolean;
}

/**
 * Partial configuration - all fields are optional
 */
export type PartialConfig = Partial<Config>;

/**
 * A dependent file with its dependency chain
 */
export interface DependentFile {
  /** The file path */
  file: string;
  /** The chain of dependencies from changed file to this file */
  chain: string[];
}

/**
 * Result of analyzing affected tests
 */
export interface AnalysisResult {
  /** All changed files in the PR */
  changedFiles: string[];
  /** Test files that directly changed */
  changedTestFiles: string[];
  /** Test files that depend on changed files */
  dependentTestFiles: DependentFile[];
  /** All unique test files to run */
  allTestFiles: string[];
  /** Optimal number of groups for parallel execution */
  optimalGroups: number;
}

/**
 * One entry of a CI group matrix
 */
export interface GroupMatrixEntry {
  /** Contiguous label of the group, starting at 0 */
  group: number;
  /** Comma-joined spec list, ready for a test runner argument */
  specs: string;
  /** Test files of this group, with the path prefix removed */
  files: string[];
}

/**
 * A CI group matrix. The shape matches the `include` key that a GitHub Actions
 * `strategy.matrix` accepts.
 */
export interface GroupMatrix {
  include: GroupMatrixEntry[];
}

/**
 * Options that control how a group matrix is built
 */
export interface GroupMatrixOptions {
  /** Maximum number of tests in one group */
  maxTestsPerGroup?: number;
  /** Upper limit on the number of groups. Use 0 for no limit. */
  maxGroups?: number;
  /** Path prefix to remove from each spec */
  pathPrefix?: string;
}

/**
 * Options for running tests
 */
export interface RunOptions {
  /** Group index (0-based) when running in parallel */
  groupIndex?: number;
  /** Total number of groups */
  totalGroups?: number;
  /** Dry run - don't actually execute tests */
  dryRun?: boolean;
}

/**
 * Logger interface for customizable output
 */
export interface Logger {
  log: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}
