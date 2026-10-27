import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
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

function repository(t) {
	const root = mkdtempSync(join(tmpdir(), 'superforms-git-test-'));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const remote = join(root, 'remote.git');
	const cwd = join(root, 'checkout');
	git(['init', '--bare', '--initial-branch=main', remote]);
	git(['clone', remote, cwd]);
	git(['config', 'user.name', 'Compatibility test'], cwd);
	git(['config', 'user.email', 'compat@example.invalid'], cwd);
	git(['config', 'commit.gpgsign', 'false'], cwd);
	git(['config', 'core.autocrlf', 'false'], cwd);
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

test('requires the compatibility branch and a clean checkout', (t) => {
	const { cwd } = repository(t);
	check(cwd, true);
	writeFileSync(join(cwd, 'untracked.txt'), 'work');
	assert.throws(() => check(cwd, true), /clean/);
	rmSync(join(cwd, 'untracked.txt'));
	git(['switch', 'main'], cwd);
	assert.throws(() => check(cwd), /not main/);
});

test('rejects ongoing operations before rebasing', (t) => {
	const { cwd } = repository(t);
	const state = join(cwd, '.git', 'rebase-merge');
	mkdirSync(state);
	assert.throws(() => check(cwd), /Finish or abort/);
	rmSync(state, { recursive: true });
});

test('validates explicit immutable commit arguments', () => {
	for (const value of ['main', '--all', '', 'a'.repeat(39)]) {
		assert.throws(() => commitSha(value), /40-character/);
	}
	assert.equal(commitSha('a'.repeat(40)), 'a'.repeat(40));
});

test('rebases only compatibility commits and is repeatable', (t) => {
	const { cwd, previous, target } = repository(t);
	const result = rebase(target, cwd);
	assert.equal(result.previous, previous);
	assert(ancestor(target, result.head, cwd));
	assert.equal(git(['rev-list', '--count', `${target}..HEAD`], cwd), '1');
	assert.equal(rebase(target, cwd).head, result.head);
});

test('conflicts leave the remote unchanged and can be aborted', (t) => {
	const { cwd, previous, commit } = repository(t);
	commit('shared.txt', 'compat change\n');
	git(['switch', 'main'], cwd);
	const target = commit('shared.txt', 'main change\n');
	git(['push', 'origin', 'main'], cwd);
	git(['switch', branch], cwd);
	assert.throws(() => rebase(target, cwd), /git rebase --abort/);
	assert.equal(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0], previous);
	git(['rebase', '--abort'], cwd);
	check(cwd, true);
});

test('a validation failure can stop before the explicit push step', (t) => {
	const { cwd, target, previous } = repository(t);
	rebase(target, cwd);
	assert.equal(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0], previous);
});

test('push updates only the leased compatibility ref', (t) => {
	const { cwd, target, previous } = repository(t);
	const { head } = rebase(target, cwd);
	push(target, previous, head, cwd);
	assert.equal(git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0], head);
	assert.equal(git(['ls-remote', 'origin', 'refs/heads/main'], cwd).split(/\s/)[0], target);
	push(target, head, head, cwd);
});

test('rejects concurrent branch changes instead of overwriting them', (t) => {
	const { cwd, target, previous, commit } = repository(t);
	const { head } = rebase(target, cwd);
	const concurrent = commit('someone-else.txt', 'external work\n');
	git(['push', '--force-with-lease', 'origin', branch], cwd);
	assert.throws(() => push(target, previous, head, cwd), /changed during validation/);
	assert.equal(
		git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0],
		concurrent
	);
});

test('the explicit push lease rejects a change after the final fetch', (t) => {
	const { cwd, remote, target, previous, commit } = repository(t);
	const { head } = rebase(target, cwd);
	const concurrent = commit('concurrent.txt', 'another update\n');
	git(['push', 'origin', 'HEAD:refs/heads/race-object'], cwd);
	writeFileSync(
		join(cwd, '.git', 'hooks', 'pre-push'),
		`#!/bin/sh\ngit --git-dir='${remote}' update-ref refs/heads/${branch} ${concurrent}\n`,
		{ mode: 0o755 }
	);
	assert.throws(() => push(target, previous, head, cwd));
	assert.equal(
		git(['ls-remote', 'origin', `refs/heads/${branch}`], cwd).split(/\s/)[0],
		concurrent
	);
});

test('rejects attempts to synchronize an older target', (t) => {
	const { cwd, base, target, previous } = repository(t);
	const { head } = rebase(target, cwd);
	push(target, previous, head, cwd);
	assert.throws(() => assertNotStale(base, head, target, cwd), /refusing rollback/);
	assert.throws(() => push(base, head, head, cwd), /refusing rollback/);
});

test('CI resolves exact candidates and rejects invalid release requests', (t) => {
	const { root, cwd, target, previous } = repository(t);
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
	assert.match(readFileSync(output, 'utf8'), new RegExp(`target=${target}`));
	assert.throws(() => invoke({ RELEASE_TAG: 'v3.9.9' }), /does not match/);
	assert.throws(() => invoke({ TARGET_REF: previous }), /commit on main/);
	assert.throws(() => invoke({ TARGET_REF: '--help' }));
	invoke({ TARGET_REF: previous, COMPAT_PUSH: 'true', REQUIRE_MAIN: 'false', RELEASE_TAG: '' });
	assert.match(readFileSync(output, 'utf8'), new RegExp(`previous=${previous}`));
});
