# Affected Tests Runner

Run only the tests affected by your code changes. Uses dependency analysis to find test files that import (directly or transitively) any modified files in your PR.

## Features

- **Smart dependency analysis** - Uses [madge](https://github.com/pahen/madge) to build a dependency graph and find all test files affected by changes
- **Works with any test runner** - Cypress, Jest, Vitest, or any CLI-based test runner
- **Parallel CI support** - Automatically split tests into groups for parallel execution
- **Analyze once, fan out** - `matrix` emits a CI matrix that carries the specs of each group, so no CI job repeats the analysis
- **Monorepo friendly** - Configurable path prefixes and source directories
- **GitHub Actions integration** - Detects PR context and base branches automatically
- **Zero config** - Sensible defaults work out of the box

## Compatible Test Runners

Works with any test runner that accepts spec files as CLI arguments:

| Test Runner                      | Compatible | Example Command                                     |
| -------------------------------- | ---------- | --------------------------------------------------- |
| **Jest**                         | ✅         | `jest {specs}`                                      |
| **Vitest**                       | ✅         | `vitest run {specs}`                                |
| **Cypress Component Testing**    | ✅         | `cypress run --component --spec "{specs}"`          |
| **Mocha**                        | ✅         | `mocha {specs}`                                     |
| **Playwright Component Testing** | ✅         | `playwright test {specs}`                           |
| **AVA**                          | ✅         | `ava {specs}`                                       |
| **Cypress E2E**                  | ❌         | Not supported - E2E tests don't import source files |

> **Note:** This tool relies on analyzing import/dependency chains between your source code and test files. It works with **unit tests** and **component tests** that import the code they're testing. **E2E tests** typically don't import source files directly, so dependency analysis won't find them.

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

# Get a CI matrix that carries the specs of each group
npx affected-tests matrix
```

## CLI Usage

```bash
affected-tests [command] [options]
```

### Commands

| Command   | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| `run`     | Run affected tests (default)                                            |
| `analyze` | Analyze affected tests without running                                  |
| `matrix`  | Output a CI matrix that carries the specs of each group                 |
| `groups`  | Output optimal number of groups for CI matrix (deprecated, use `matrix`) |

### Options

| Option               | Description                                       | Default                       |
| -------------------- | ------------------------------------------------- | ----------------------------- |
| `--config <path>`    | Path to config file                               | Auto-detected                 |
| `--src-dir <path>`   | Source directory to analyze                       | `./src`                       |
| `--base-dir <path>`  | Base directory (where tsconfig.json is)           | `cwd`                         |
| `--path-prefix`      | Path prefix for monorepos (e.g., `apps/web/`)     | `""`                          |
| `--base-branch`      | Base branch to compare against                    | `master`                      |
| `--test-command`     | Test command template (use `{specs}` placeholder) | `npx cypress run...`          |
| `--test-pattern`     | Regex pattern for test files                      | `\.spec\.(ts\|tsx\|js\|jsx)$` |
| `--max-tests <n>`    | Max tests per group                               | `20`                          |
| `--max-groups <n>`   | Cap on the number of groups (`0` for no cap)      | `0`                           |
| `--group <n>`        | Group index (0-based) for parallel runs           | -                             |
| `--total-groups <n>` | Total number of groups                            | -                             |
| `--verbose`          | Enable verbose output                             | `false`                       |
| `--dry-run`          | Show what would run without executing             | `false`                       |
| `--json`             | Output results as JSON (for `analyze` command)    | `false`                       |

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

# Run all groups in parallel locally
GROUPS=$(npx affected-tests groups) && \
  if (( GROUPS > 0 )); then \
    seq 0 $((GROUPS-1)) | xargs -P "$GROUPS" -I {} \
      npx affected-tests run --group {} --total-groups "$GROUPS"; \
  else \
    echo "No affected tests to run"; \
  fi
```

## Configuration File

Create `affected-tests.config.js` in your project root:

```javascript
module.exports = {
  // Source directory to analyze for dependencies
  srcDir: "./src",

  // Base directory (where tsconfig.json is located)
  baseDir: process.cwd(),

  // Path prefix for monorepos
  pathPrefix: "apps/web/",

  // Branch to compare against
  baseBranch: "main",

  // Test file pattern (as string or RegExp)
  testFilePattern: "\\.spec\\.(ts|tsx)$",

  // File extensions to analyze
  fileExtensions: ["ts", "tsx", "js", "jsx"],

  // Path to tsconfig.json relative to baseDir
  tsConfigPath: "tsconfig.json",

  // Patterns to exclude from analysis
  excludePatterns: [/node_modules/, /\.generated\./],

  // Command to run tests. Use {specs} as placeholder
  testCommand: 'npx cypress run --component --spec "{specs}"',

  // Max tests per group for parallel execution
  maxTestsPerGroup: 20,

  // Cap on the number of groups. Each group costs one CI runner, so a cap
  // protects the matrix from a change that affects the whole suite.
  // Use 0 for no cap.
  maxGroups: 0,

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
  getAffectedTestMatrix,
} from "affected-tests-runner";

// Analyze affected tests
const analysis = await analyzeAffectedTests({
  srcDir: "./src",
  pathPrefix: "apps/web/",
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
await runAffectedTests({ srcDir: "./src" }, { groupIndex: 0, totalGroups: 3 });

// Get a CI matrix, analyzed once, with the specs of each group
const matrix = await getAffectedTestMatrix({ maxTestsPerGroup: 10 });
// {
//   include: [
//     { group: 0, specs: 'src/a.spec.ts,src/c.spec.ts', files: [...] },
//     { group: 1, specs: 'src/b.spec.ts', files: [...] },
//   ],
// }
```

`getAffectedTestMatrix` reads the config file once. To reuse a configuration you
already resolved, call `analyzeWithConfig` and `buildGroupMatrix` yourself:

```typescript
import {
  resolveConfig,
  analyzeWithConfig,
  buildGroupMatrix,
  silentLogger,
} from "affected-tests-runner";

const config = await resolveConfig({});
const analysis = await analyzeWithConfig(config, silentLogger);
const matrix = buildGroupMatrix(analysis.allTestFiles, config);
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
          fetch-depth: 0 # Required for git diff

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm ci
      - run: npx affected-tests run
```

### Parallel Execution with Dynamic Matrix

The `matrix` command analyzes the changes once and gives each job its own spec
list. No job repeats the git fetch or the dependency analysis, and each job
starts the test runner directly.

```yaml
jobs:
  calculate-groups:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.groups.outputs.matrix }}
      total-groups: ${{ steps.groups.outputs.total-groups }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
      - run: npm ci

      - id: groups
        run: |
          MATRIX=$(npx affected-tests matrix)

          # Validate before writing either output. Writing the count inside an
          # echo would mask a jq failure behind echo's own exit code, and an
          # empty total-groups skips the test job behind a green check.
          if ! jq -e '.include | type == "array"' <<< "$MATRIX" > /dev/null; then
            echo "Invalid test matrix: $MATRIX" >&2
            exit 1
          fi

          TOTAL_GROUPS=$(jq -r '.include | length' <<< "$MATRIX")
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT
          echo "total-groups=$TOTAL_GROUPS" >> $GITHUB_OUTPUT

  test:
    needs: calculate-groups
    # An empty include list cannot expand a matrix, so guard the job.
    if: needs.calculate-groups.outputs.total-groups > 0
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: ${{ fromJson(needs.calculate-groups.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      # `files` is an array, so join it with the separator your runner wants.
      # Pass it through the environment: a spec path interpolated straight into
      # the command line would run as shell input.
      - run: npx cypress run --component --spec "$SPECS"
        env:
          SPECS: ${{ join(matrix.files) }}
```

`join` defaults to a comma. A runner that takes space-separated paths, such as
Jest, asks for a space:

```yaml
      - run: npx jest $SPECS
        env:
          SPECS: ${{ join(matrix.files, ' ') }}
```

Each path is relative to `pathPrefix`, so a monorepo consumer runs the step in
that directory:

```yaml
      - run: npx cypress run --component --spec "$SPECS"
        working-directory: apps/web
        env:
          SPECS: ${{ join(matrix.files) }}
```

The command writes one JSON line to stdout and sends every progress message to
stderr, so the output goes straight into `$GITHUB_OUTPUT`:

```json
{
  "include": [
    { "group": 0, "files": ["src/a.spec.ts", "src/c.spec.ts"] },
    { "group": 1, "files": ["src/b.spec.ts"] }
  ]
}
```

Each entry carries the file list as an array, not a joined string, so the
separator stays the consumer's choice.

The command exits with a non-zero code when the analysis fails. Do not fall back
to a default matrix: a wrong matrix hides untested code behind a green check.

Each group costs one runner. Set `maxGroups` when a change that affects the
whole suite must not start hundreds of jobs:

```bash
npx affected-tests matrix --max-tests 10 --max-groups 12
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
