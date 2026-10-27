// @ts-check

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [profile, archive] = process.argv.slice(2);
if (!['kit2', 'kit2-min', 'kit3'].includes(profile) || !archive) {
	throw new Error('Usage: pnpm compat:consumer <kit2|kit2-min|kit3> <package.tgz>');
}
const tarball = resolve(archive);
const cli = process.env.npm_execpath;
if (!cli || !existsSync(cli)) {
	throw new Error('Run this command through pnpm compat:consumer.');
}
const directory = mkdtempSync(join(tmpdir(), 'superforms-consumer-'));
try {
	const copyOptions = {
		recursive: true,
		filter: (/** @type {string} */ source) =>
			!['.svelte-kit', 'node_modules'].includes(basename(source))
	};
	cpSync(join(root, 'tests', 'consumer', 'common'), directory, copyOptions);
	cpSync(join(root, 'tests', 'consumer', profile), directory, copyOptions);
	execFileSync('tar', ['-xzf', tarball, '-C', directory], { stdio: 'inherit' });
	const packed = JSON.parse(readFileSync(join(directory, 'package', 'package.json'), 'utf8'));
	const fixture = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
	for (const [name, version] of Object.entries({
		...packed.dependencies,
		...packed.optionalDependencies
	})) {
		if (fixture.dependencies[name] !== version) {
			throw new Error(`Update and relock consumer dependency ${name} to ${version}.`);
		}
	}
	for (const args of [
		['install', '--frozen-lockfile'],
		['exec', 'svelte-kit', 'sync'],
		['exec', 'svelte-check', '--tsconfig', './tsconfig.json'],
		['exec', 'vite', 'build']
	]) {
		const script = /\.[cm]?js$/.test(cli);
		execFileSync(script ? process.execPath : cli, script ? [cli, ...args] : args, {
			cwd: directory,
			stdio: 'inherit'
		});
	}
	execFileSync(process.execPath, ['smoke.mjs'], {
		cwd: directory,
		stdio: 'inherit',
		timeout: 60000
	});
	const kit = JSON.parse(
		readFileSync(join(directory, 'node_modules', '@sveltejs', 'kit', 'package.json'), 'utf8')
	);
	const summary = `${profile}: Kit ${kit.version}, Superforms ${packed.version}, SHA256 ${createHash('sha256').update(readFileSync(tarball)).digest('hex')}`;
	console.log(summary);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary}\n`);
	}
} finally {
	rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
