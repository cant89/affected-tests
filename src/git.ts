import { execSync } from 'child_process';
import type { Config, Logger } from './types';

/**
 * Ensure git history is available in CI environments
 */
function ensureGitHistory(logger: Logger): void {
  if (!process.env.CI) {
    return;
  }

  try {
    logger.debug('\n📥 Fetching Git History');
    logger.debug('----------------------');

    // Fetch more history and all branches to ensure we have the required refs
    execSync('git fetch --prune --unshallow > /dev/null 2>&1 || true');
    execSync(
      'git fetch origin +refs/heads/*:refs/remotes/origin/* > /dev/null 2>&1 || true'
    );

    logger.debug('✅ Git history fetched successfully\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Error fetching git history: ${message}`);
    throw error;
  }
}

/**
 * Determine the current and target branches for comparison
 */
function determineBranches(
  baseBranch: string,
  logger: Logger
): { currentBranch: string; targetBranch: string } {
  let currentBranch: string;
  let targetBranch = `origin/${baseBranch}`;

  logger.debug('🔍 Determining Branch Information');
  logger.debug('-------------------------------');

  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    // For pull requests, use the GITHUB_REF
    currentBranch = `origin/${process.env.GITHUB_HEAD_REF}`;
    targetBranch = `origin/${process.env.GITHUB_BASE_REF || baseBranch}`;
    logger.debug(
      `📌 PR detected: comparing ${currentBranch} against ${targetBranch}`
    );
  } else if (process.env.GITHUB_REF) {
    // For other GitHub events
    currentBranch = process.env.GITHUB_REF.replace('refs/heads/', 'origin/');
    logger.debug(`📌 Using GitHub ref: ${currentBranch}`);
  } else {
    // Fallback to git command for local development
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
    logger.debug(`📌 Local development detected, using branch: ${currentBranch}`);
  }

  logger.debug('✅ Branch information determined\n');

  return { currentBranch, targetBranch };
}

/**
 * Get uncommitted changes (staged + unstaged)
 */
function getUncommittedChanges(logger: Logger): string[] {
  const uncommittedFiles: Set<string> = new Set();

  // Get staged changes
  const staged = execSync('git diff --cached --name-only')
    .toString()
    .split('\n')
    .filter((file) => file.trim() !== '');

  staged.forEach((file) => uncommittedFiles.add(file));

  if (staged.length > 0) {
    logger.debug(`  📝 Staged changes: ${staged.length} files`);
  }

  // Get unstaged changes
  const unstaged = execSync('git diff --name-only')
    .toString()
    .split('\n')
    .filter((file) => file.trim() !== '');

  unstaged.forEach((file) => uncommittedFiles.add(file));

  if (unstaged.length > 0) {
    logger.debug(`  📝 Unstaged changes: ${unstaged.length} files`);
  }

  // Get untracked files (new files not yet added)
  const untracked = execSync('git ls-files --others --exclude-standard')
    .toString()
    .split('\n')
    .filter((file) => file.trim() !== '');

  untracked.forEach((file) => uncommittedFiles.add(file));

  if (untracked.length > 0) {
    logger.debug(`  📝 Untracked files: ${untracked.length} files`);
  }

  return Array.from(uncommittedFiles);
}

/**
 * Get list of changed files from current PR/branch against base branch
 * Includes both committed and uncommitted changes
 */
export function getChangedFiles(config: Config, logger: Logger): string[] {
  try {
    ensureGitHistory(logger);

    const { currentBranch, targetBranch } = determineBranches(
      config.baseBranch,
      logger
    );

    logger.debug('📊 Analyzing Changed Files');
    logger.debug('------------------------');

    const allChangedFiles: Set<string> = new Set();

    // Get committed changes between branches
    // Use merge-base to find the common ancestor, so we only detect changes
    // introduced on the current branch (not new commits on the target branch)
    const mergeBase = execSync(`git merge-base ${targetBranch} ${currentBranch}`)
      .toString()
      .trim();
    logger.debug(`Running git diff between merge-base (${mergeBase.slice(0, 7)}) and ${currentBranch}`);
    const committedChanges = execSync(
      `git diff --name-only ${mergeBase} ${currentBranch}`
    )
      .toString()
      .split('\n')
      .filter((file) => file.trim() !== '');

    committedChanges.forEach((file) => allChangedFiles.add(file));
    logger.debug(`  📝 Committed changes: ${committedChanges.length} files`);

    // Get uncommitted changes (staged, unstaged, untracked)
    const uncommittedChanges = getUncommittedChanges(logger);
    uncommittedChanges.forEach((file) => allChangedFiles.add(file));

    const changedFiles = Array.from(allChangedFiles);
    logger.debug(`✅ Total unique changed files: ${changedFiles.length}\n`);

    return changedFiles;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Error getting changed files: ${message}`);
    throw error;
  }
}
