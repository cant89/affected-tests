import * as fs from "fs";
import * as path from "path";
import type { Config, PartialConfig, Logger } from "./types";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  srcDir: "./src",
  baseDir: process.cwd(),
  pathPrefix: "",
  baseBranch: "master",
  testFilePattern: /\.spec\.(ts|tsx|js|jsx)$/,
  fileExtensions: ["ts", "tsx", "js", "jsx"],
  tsConfigPath: "tsconfig.json",
  excludePatterns: [/node_modules/],
  testCommand: 'npx cypress run --component --spec "{specs}"',
  maxTestsPerGroup: 20,
  skipTypeImports: true,
  verbose: false,
};

/**
 * Config file names to look for (in order of priority)
 */
const CONFIG_FILE_NAMES = [
  "affected-tests.config.js",
  "affected-tests.config.mjs",
  "affected-tests.config.json",
  ".affected-testsrc",
  ".affected-testsrc.json",
];

/**
 * Default console logger
 */
export const consoleLogger: Logger = {
  log: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
  debug: (message: string) => console.log(message),
};

/**
 * Silent logger (for testing or quiet mode)
 */
export const silentLogger: Logger = {
  log: () => {},
  error: () => {},
  debug: () => {},
};

/**
 * Create a logger that respects verbose setting
 */
export function createLogger(verbose: boolean): Logger {
  return {
    log: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
    debug: verbose ? (message: string) => console.log(message) : () => {},
  };
}

/**
 * Load configuration from a file if it exists
 */
export async function loadConfigFile(
  configPath?: string
): Promise<PartialConfig> {
  const cwd = process.cwd();

  // If a specific config path is provided, use it
  if (configPath) {
    const fullPath = path.isAbsolute(configPath)
      ? configPath
      : path.join(cwd, configPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Config file not found: ${fullPath}`);
    }

    return loadConfigFromPath(fullPath);
  }

  // Otherwise, look for config files in order of priority
  for (const fileName of CONFIG_FILE_NAMES) {
    const fullPath = path.join(cwd, fileName);
    if (fs.existsSync(fullPath)) {
      return loadConfigFromPath(fullPath);
    }
  }

  // No config file found, return empty config
  return {};
}

/**
 * Load configuration from a specific path
 */
async function loadConfigFromPath(filePath: string): Promise<PartialConfig> {
  const ext = path.extname(filePath);

  if (ext === ".json" || filePath.endsWith("rc")) {
    const content = fs.readFileSync(filePath, "utf-8");
    return parseJsonConfig(JSON.parse(content));
  }

  if (ext === ".js" || ext === ".mjs") {
    // Dynamic import for JS config files - no need to parse, JS can have native RegExp
    const config = await import(filePath);
    return (config.default || config) as PartialConfig;
  }

  throw new Error(`Unsupported config file format: ${ext}`);
}

/**
 * Parse JSON config and convert string patterns to RegExp
 */
function parseJsonConfig(config: Record<string, unknown>): PartialConfig {
  const result: PartialConfig = { ...config } as PartialConfig;

  // Convert testFilePattern string to RegExp
  if (typeof config.testFilePattern === "string") {
    result.testFilePattern = new RegExp(config.testFilePattern);
  }

  // Convert excludePatterns strings to RegExp array
  if (Array.isArray(config.excludePatterns)) {
    result.excludePatterns = config.excludePatterns.map((pattern) =>
      typeof pattern === "string" ? new RegExp(pattern) : pattern
    );
  }

  return result;
}

/**
 * Merge configuration with defaults
 */
export function mergeConfig(partial: PartialConfig): Config {
  return {
    ...DEFAULT_CONFIG,
    ...partial,
  };
}

/**
 * Create a fully resolved configuration
 */
export async function resolveConfig(
  options: PartialConfig & { configPath?: string } = {}
): Promise<Config> {
  const { configPath, ...overrides } = options;

  // Load from config file first
  const fileConfig = await loadConfigFile(configPath);

  // Merge: defaults < file config < CLI overrides
  return mergeConfig({
    ...fileConfig,
    ...overrides,
  });
}
