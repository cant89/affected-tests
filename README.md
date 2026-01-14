# affected-tests

Run only the tests affected by your code changes. Uses dependency analysis to find test files that import (directly or transitively) any modified files in your PR.

## Features

- **Smart dependency analysis** - Uses [madge](https://github.com/pahen/madge) to build a dependency graph and find all test files affected by changes
- **Works with any test runner** - Cypress, Jest, Vitest, or any CLI-based test runner
- **Parallel CI support** - Automatically split tests into groups for parallel execution
- **Monorepo friendly** - Configurable path prefixes and source directories
- **GitHub Actions integration** - Detects PR context and base branches automatically
- **Zero config** - Sensible defaults work out of the box

## Installation

```bash
npm install affected-tests
# or
pnpm add affected-tests
# or
yarn add affected-tests
```

## Quick Start

```bash
# Run all affected tests
npx affected-tests run

# See what would run without executing
npx affected-tests run --dry-run

# Get optimal group count for CI matrix
npx affected-tests groups
```

## CLI Usage

```bash
affected-tests [command] [options]
```

### Commands

| Command   | Description                                      |
| --------- | ------------------------------------------------ |
| `run`     | Run affected tests (default)                     |
| `analyze` | Analyze affected tests without running           |
| `groups`  | Output optimal number of groups for CI matrix    |

### Options

| Option               | Description                                            | Default                    |
| -------------------- | ------------------------------------------------------ | -------------------------- |
| `--config <path>`    | Path to config file                                    | Auto-detected              |
| `--src-dir <path>`   | Source directory to analyze                            | `./src`                    |
| `--base-dir <path>`  | Base directory (where tsconfig.json is)                | `cwd`                      |
| `--path-prefix`      | Path prefix for monorepos (e.g., `apps/web/`)          | `""`                       |
| `--base-branch`      | Base branch to compare against                         | `master`                   |
| `--test-command`     | Test command template (use `{specs}` placeholder)      | `npx cypress run...`       |
| `--test-pattern`     | Regex pattern for test files                           | `\.spec\.(ts\|tsx\|js)$`   |
| `--max-tests <n>`    | Max tests per group                                    | `20`                       |
| `--group <n>`        | Group index (0-based) for parallel runs                | -                          |
| `--total-groups <n>` | Total number of groups                                 | -                          |
| `--verbose`          | Enable verbose output                                  | `false`                    |
| `--dry-run`          | Show what would run without executing                  | `false`                    |
| `--json`             | Output results as JSON (for `analyze` command)         | `false`                    |

### Examples

```bash
# Run tests with custom command
affected-tests run --test-command 'npx jest {specs}'

# Run tests in parallel (group 1 of 3)
affected-tests run --group 0 --total-groups 3

# Analyze changes for a feature branch
affected-tests analyze --base-branch main --json

# Monorepo usage
affected-tests run --path-prefix 'packages/app/' --src-dir './src'
```

## Configuration File

Create `affected-tests.config.js` in your project root:

```javascript
module.exports = {
  // Source directory to analyze for dependencies
  srcDir: './src',

  // Base directory (where tsconfig.json is located)
  baseDir: process.cwd(),

  // Path prefix for monorepos
  pathPrefix: 'apps/web/',

  // Branch to compare against
  baseBranch: 'main',

  // Test file pattern (as string or RegExp)
  testFilePattern: '\\.spec\\.(ts|tsx)$',

  // File extensions to analyze
  fileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Path to tsconfig.json relative to baseDir
  tsConfigPath: 'tsconfig.json',

  // Patterns to exclude from analysis
  excludePatterns: [/node_modules/, /\.generated\./],

  // Command to run tests. Use {specs} as placeholder
  testCommand: 'npx cypress run --component --spec "{specs}"',

  // Max tests per group for parallel execution
  maxTestsPerGroup: 20,

  // Skip TypeScript type-only imports
  skipTypeImports: true,

  // Enable verbose logging
  verbose: false,
};
```

Supported config file names (in order of priority):
- `affected-tests.config.js`
- `affected-tests.config.mjs`
- `affected-tests.config.json`
- `.affected-testsrc`
- `.affected-testsrc.json`

## Programmatic API

```typescript
import {
  runAffectedTests,
  analyzeAffectedTests,
  getOptimalGroupCount,
} from 'affected-tests';

// Analyze affected tests
const analysis = await analyzeAffectedTests({
  srcDir: './src',
  pathPrefix: 'apps/web/',
});

console.log(analysis);
// {
//   changedFiles: ['src/utils/format.ts'],
//   changedTestFiles: [],
//   dependentTestFiles: [{ file: 'src/utils/format.spec.ts', chain: [...] }],
//   allTestFiles: ['src/utils/format.spec.ts'],
//   optimalGroups: 1,
// }

// Run affected tests
await runAffectedTests(
  { srcDir: './src' },
  { groupIndex: 0, totalGroups: 3 }
);

// Get optimal group count for CI
const groups = await getOptimalGroupCount({ maxTestsPerGroup: 10 });
```

## GitHub Actions Integration

### Basic Usage

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for git diff

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx affected-tests run
```

### Parallel Execution with Dynamic Matrix

```yaml
jobs:
  calculate-groups:
    runs-on: ubuntu-latest
    outputs:
      groups: ${{ steps.groups.outputs.groups }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
      - run: npm ci

      - id: groups
        run: |
          GROUPS=$(npx affected-tests groups)
          if [ "$GROUPS" -eq "0" ]; then
            echo "groups=[]" >> $GITHUB_OUTPUT
          else
            echo "groups=$(seq 0 $((GROUPS-1)) | jq -s -c '.')" >> $GITHUB_OUTPUT
          fi

  test:
    needs: calculate-groups
    if: needs.calculate-groups.outputs.groups != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        group: ${{ fromJson(needs.calculate-groups.outputs.groups) }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
      - run: npm ci

      - run: |
          npx affected-tests run \
            --group ${{ matrix.group }} \
            --total-groups ${{ strategy.job-total }}
```

## How It Works

1. **Get changed files** - Compares current branch against base branch using `git diff`
2. **Build dependency graph** - Uses [madge](https://github.com/pahen/madge) to analyze imports
3. **Find affected tests** - Walks the dependency graph to find test files that import changed code
4. **Split into groups** - Optionally distributes tests across parallel jobs using round-robin
5. **Run tests** - Executes your test command with the affected spec files

### Limitations

This tool uses **file-level** dependency analysis, which may produce some false positives:

- **Named imports not tracked** - If a file exports multiple functions and only one changes, all importers are considered affected
- **Barrel files** - Re-exports through `index.ts` files cause all downstream imports to be considered affected, even if they import unrelated exports
- **Dynamic imports** - `import()` expressions may not be detected

**Recommendation:** Prefer direct imports over barrel files when possible (e.g., `import { Button } from './Button/Button'` instead of `import { Button } from './components'`).

This is an acceptable trade-off: running a few extra tests is safer than missing genuinely affected ones, and still far more efficient than running your entire test suite.

## License

MIT
