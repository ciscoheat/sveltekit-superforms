// @ts-check

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, onTestFinished, test } from 'vitest';
import {
	ancestor,
	assertNotStale,
	branch,
	check,
	commitSha,
	git,
	push,
	rebase
} from './compat.mjs';

function repository() {
	const root = mkdtempSync(join(tmpdir(), 'superforms-git-test-'));
	onTestFinished(() => rmSync(root, { recursive: true, force: true }));
	const remote = join(root, 'remote.git');
	const cwd = join(root, 'checkout');
	git(['init', '--bare', '--initial-branch=main', remote]);
	git(['clone', remote, cwd]);
	git(['config', 'user.name', 'Compatibility test'], cwd);
	git(['config', 'user.email', 'compat@example.invalid'], cwd);
	git(['config', 'commit.gpgsign', 'false'], cwd);
	git(['config', 'core.autocrlf', 'false'], cwd);
	/** @param {string} file @param {string} content */
	const commit = (file, content) => {
		writeFileSync(join(cwd, file), content);
		git(['add', file], cwd);
		git(['commit', '-qm', file], cwd);
		return git(['rev-parse', 'HEAD'], cwd);
	};
	commit('shared.txt', 'base\n');
	const base = commit('package.json', '{"version":"3.1.0"}\n');
	git(['push', 'origin', 'main'], cwd);
	git(['switch', '-c', branch], cwd);
	const previous = commit('compat.txt', 'compat\n');
	git(['push', 'origin', branch], cwd);
	git(['switch', 'main'], cwd);
	const target = commit('main.txt', 'new main\n');
	git(['push', 'origin', 'main'], cwd);
	git(['switch', branch], cwd);
	return { root, remote, cwd, base, previous, target, commit };
}

test('requires the compatibility branch and a clean checkout', () => {
	const { cwd } = repository();
	check(cwd, true);
	writeFileSync(join(cwd, 'untracked.txt'), 'work');
	expect(() => check(cwd, true)).toThrow(/clean/);
	rmSync(join(cwd, 'untracked.txt'));
	git(['switch', 'main'], cwd);
	expect(() => check(cwd)).toThrow(/not main/);
});

test('rejects ongoing operations before rebasing', () => {
	const { cwd } = repository();
	const state = join(cwd, '.git', 'rebase-merge');
	mkdirSync(state);
	expect(() => check(cwd)).toThrow(/Finish or abort/);
	rmSync(state, { recursive: true });
});

test('validates explicit immutable commit arguments', () => {
	for (const value of ['main', '--all', '', 'a'.repeat(39)]) {
		expect(() => commitSha(value)).toThrow(/40-character/);
	}
	expect(commitSha('a'.repeat(40))).toBe('a'.repeat(40));
});

test('rebases only compatibility commits and is repeatable', () => {
	const { cwd, previous, target } = repository();
	const result = rebase(target, cwd);
	expect(result.previous).toBe(previous);
	expect(ancestor(target, result.head, cwd)).toBeTruthy();
	expect(git(['rev-list', '--count', `${target}..HEAD`], cwd)).toBe('1');
	expect(rebase(target, cwd).head).toBe(result.head);
});

test('conflicts leave the remote unchanged and can be aborted', () => {
	const { cwd, previous, commit } = repository();
	commit('shared.txt', 'compat change\n');
	git(['switch', 'main'], cwd);
	const target = commit('shared.txt', 'main change\n');
	git(['push', 'origin', 'main'], cwd);
	git(['switch', branch], cwd);
	expect(() => rebase(target, cwd)).toThrow(/git rebase --abort/);
	expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0]).toBe(previous);
	git(['rebase', '--abort'], cwd);
	check(cwd, true);
});

test('a validation failure can stop before the explicit push step', () => {
	const { cwd, target, previous } = repository();
	rebase(target, cwd);
	expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0]).toBe(previous);
});

test('push updates only the leased compatibility ref', () => {
	const { cwd, target, previous } = repository();
	const { head } = rebase(target, cwd);
	push(target, previous, head, cwd);
	expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0]).toBe(head);
	expect(git(['ls-remote', 'origin', 'refs/heads/main'], cwd).split(/\s/)[0]).toBe(target);
	push(target, head, head, cwd);
});

test('rejects concurrent branch changes instead of overwriting them', () => {
	const { cwd, target, previous, commit } = repository();
	const { head } = rebase(target, cwd);
	const concurrent = commit('someone-else.txt', 'external work\n');
	git(['push', '--force-with-lease', 'origin', branch], cwd);
	expect(() => push(target, previous, head, cwd)).toThrow(/changed during validation/);
	expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0]).toBe(concurrent);
});

test('the explicit push lease rejects a change after the final fetch', () => {
	const { cwd, remote, target, previous, commit } = repository();
	const { head } = rebase(target, cwd);
	const concurrent = commit('concurrent.txt', 'another update\n');
	git(['push', 'origin', 'HEAD:refs/heads/race-object'], cwd);
	writeFileSync(
		join(cwd, '.git', 'hooks', 'pre-push'),
		`#!/bin/sh\ngit --git-dir='${remote}' update-ref refs/heads/${branch} ${concurrent}\n`,
		{ mode: 0o755 }
	);
	expect(() => push(target, previous, head, cwd)).toThrow();
	expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0]).toBe(concurrent);
});

test('rejects attempts to synchronize an older target', () => {
	const { cwd, base, target, previous } = repository();
	const { head } = rebase(target, cwd);
	push(target, previous, head, cwd);
	expect(() => assertNotStale(base, head, target, cwd)).toThrow(/refusing rollback/);
	expect(() => push(base, head, head, cwd)).toThrow(/refusing rollback/);
});

test('CI resolves exact candidates and rejects invalid release requests', () => {
	const { root, cwd, target, previous } = repository();
	const output = join(root, 'output');
	const invoke = (env = {}) =>
		execFileSync(process.execPath, [fileURLToPath(new URL('./resolve-ci.mjs', import.meta.url))], {
			cwd,
			env: {
				...process.env,
				TARGET_REF: target,
				GITHUB_OUTPUT: output,
				GITHUB_STEP_SUMMARY: join(root, 'summary'),
				REQUIRE_MAIN: 'true',
				RELEASE_TAG: 'v3.1.0',
				...env
			},
			stdio: 'pipe'
		});
	invoke();
	expect(readFileSync(output, 'utf8')).toMatch(new RegExp(`target=${target}`));
	expect(() => invoke({ RELEASE_TAG: 'v3.9.9' })).toThrow(/does not match/);
	expect(() => invoke({ TARGET_REF: previous })).toThrow(/commit on main/);
	expect(() => invoke({ TARGET_REF: '--help' })).toThrow();
	invoke({ TARGET_REF: previous, COMPAT_PUSH: 'true', REQUIRE_MAIN: 'false', RELEASE_TAG: '' });
	expect(readFileSync(output, 'utf8')).toMatch(new RegExp(`previous=${previous}`));
});
