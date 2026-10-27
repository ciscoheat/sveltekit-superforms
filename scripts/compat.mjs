// @ts-check

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const branch = 'v3/sveltekit-2';

/**
 * @param {string[]} args
 * @param {string} [cwd]
 */
export function git(args, cwd = process.cwd()) {
	return execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true' },
		stdio: ['ignore', 'pipe', 'pipe']
	}).trim();
}

/** @param {string} cwd */
function assertNoOperation(cwd) {
	for (const state of ['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD']) {
		if (existsSync(resolve(cwd, git(['rev-parse', '--git-path', state], cwd)))) {
			throw new Error('Finish or abort the current rebase/merge/cherry-pick first.');
		}
	}
}

/** @param {string} cwd */
function assertClean(cwd) {
	if (git(['status', '--porcelain', '--untracked-files=normal'], cwd)) {
		throw new Error(
			'The checkout must be clean, including untracked files. Commit your work first.'
		);
	}
}

export function check(cwd = process.cwd(), clean = false) {
	assertNoOperation(cwd);
	if (git(['branch', '--show-current'], cwd) !== branch) {
		throw new Error(`Run this command on ${branch}, not main or a detached HEAD.`);
	}
	if (clean) assertClean(cwd);
}

/** @param {string} value */
export function commitSha(value) {
	if (!/^[a-f0-9]{40}$/.test(value)) throw new Error('Expected a full 40-character commit SHA.');
	return value;
}

/**
 * @param {string} older
 * @param {string} newer
 * @param {string} [cwd]
 */
export function ancestor(older, newer, cwd = process.cwd()) {
	return git(['merge-base', older, newer], cwd) === git(['rev-parse', older], cwd);
}

/**
 * @param {string} target
 * @param {string} previous
 * @param {string} main
 * @param {string} [cwd]
 */
export function assertNotStale(target, previous, main, cwd = process.cwd()) {
	const base = git(['merge-base', previous, main], cwd);
	if (!ancestor(base, target, cwd)) {
		throw new Error(
			`Target ${target} does not include compatibility base ${base}; refusing rollback.`
		);
	}
}

/**
 * @param {string} target
 * @param {string} [cwd]
 */
export function rebase(target, cwd = process.cwd()) {
	check(cwd, true);
	commitSha(target);
	const previous = git(['rev-parse', 'HEAD'], cwd);
	const main = git(['rev-parse', 'refs/remotes/origin/main'], cwd);
	assertNotStale(target, previous, main, cwd);
	const base = git(['merge-base', previous, main], cwd);
	try {
		git(['rebase', '--onto', target, base], cwd);
	} catch (error) {
		const details = error instanceof Error ? error : new Error(String(error));
		const stderr = /** @type {Error & { stderr?: Buffer }} */ (details).stderr;
		throw new Error(
			`Rebase failed. Inspect git status, resolve and stage conflicts, then git rebase --continue; or git rebase --abort.\n${stderr || details.message}`,
			{ cause: error }
		);
	}
	return { previous, target, head: git(['rev-parse', 'HEAD'], cwd) };
}

/** @param {string} [cwd] */
export function refresh(cwd = process.cwd()) {
	const currentBranch = git(['branch', '--show-current'], cwd);
	if (currentBranch !== 'main' && currentBranch !== branch) {
		throw new Error(
			`Run this command from main or ${branch}, not ${currentBranch || 'detached HEAD'}.`
		);
	}
	assertNoOperation(cwd);
	assertClean(cwd);
	git(['fetch', '--no-tags', 'origin'], cwd);

	if (currentBranch === 'main') {
		const localBranch = git(['branch', '--list', branch], cwd);
		git(
			localBranch
				? ['switch', branch]
				: ['switch', '--track', '--create', branch, `origin/${branch}`],
			cwd
		);
	}

	check(cwd, true);
	git(['pull', '--ff-only', 'origin', branch], cwd);
	const previous = git(['rev-parse', `refs/remotes/origin/${branch}`], cwd);
	if (git(['rev-parse', 'HEAD'], cwd) !== previous) {
		throw new Error(
			`Local ${branch} has unpublished commits. Inspect them before refreshing; refusing to overwrite them.`
		);
	}
	const target = git(['rev-parse', 'refs/remotes/origin/main'], cwd);
	console.log(`Refreshing ${branch} from ${previous} onto main ${target}.`);
	console.log('After validation, push with:');
	console.log(
		`git push "--force-with-lease=refs/heads/${branch}:${previous}" origin HEAD:refs/heads/${branch}`
	);
	const result = rebase(target, cwd);
	return { previous, target, head: result.head };
}

/**
 * @param {string} target
 * @param {string} previous
 * @param {string} next
 * @param {string} [cwd]
 */
export function push(target, previous, next, cwd = process.cwd()) {
	[target, previous, next].forEach(commitSha);
	git(['fetch', '--no-tags', 'origin', 'main'], cwd);
	const main = git(['rev-parse', 'refs/remotes/origin/main'], cwd);
	if (!ancestor(target, main, cwd) || !ancestor(target, next, cwd)) {
		throw new Error(
			'The target must be on main and included in the validated compatibility commit.'
		);
	}
	git(['fetch', '--no-tags', 'origin', `refs/heads/${branch}`], cwd);
	const live = git(['rev-parse', 'FETCH_HEAD'], cwd);
	if (live !== previous) throw new Error('Compatibility branch changed during validation; rerun.');
	assertNotStale(target, live, main, cwd);
	if (previous !== next) {
		git(
			[
				'push',
				`--force-with-lease=refs/heads/${branch}:${previous}`,
				'origin',
				`${next}:refs/heads/${branch}`
			],
			cwd
		);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	try {
		const [command, ...args] = process.argv.slice(2);
		if (command === 'check' && !args.length) {
			check();
		} else if (command === 'rebase' && args.length <= 1) {
			check(process.cwd(), true);
			git(['fetch', '--no-tags', 'origin', 'main']);
			const target = args[0] || git(['rev-parse', 'refs/remotes/origin/main']);
			console.log(JSON.stringify(rebase(target), null, 2));
		} else if (command === 'refresh' && !args.length) {
			const { target, head } = refresh();
			console.log(`Rebased ${branch} to ${head}.`);
			console.log('Run pnpm compat:sveltekit2 before pushing.');
			console.log(`Validated target: ${target}`);
		} else if (command === 'push' && args.length === 3) {
			const pushArgs = /** @type {[string, string, string]} */ (args);
			push(...pushArgs);
		} else {
			throw new Error(
				'Usage: compat.mjs check | rebase [commit-sha] | refresh | push <target> <old> <validated>'
			);
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
