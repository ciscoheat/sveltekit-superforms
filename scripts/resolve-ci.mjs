import { appendFileSync } from 'node:fs';
import { ancestor, assertNotStale, commitSha, git } from './compat.mjs';

let previous = git(['rev-parse', 'refs/remotes/origin/v3/sveltekit-2']);
const main = git(['rev-parse', 'refs/remotes/origin/main']);
let target = git([
	'rev-parse',
	'--verify',
	'--end-of-options',
	`${process.env.TARGET_REF}^{commit}`
]);
if (process.env.COMPAT_PUSH === 'true') {
	previous = target;
	target = git(['merge-base', target, main]);
}
commitSha(target);
if (process.env.REQUIRE_MAIN === 'true') {
	if (!ancestor(target, main))
		throw new Error('Release synchronization requires a commit on main.');
	assertNotStale(target, previous, main);
	const pkg = JSON.parse(git(['show', `${target}:package.json`]));
	if (!/^3\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
		throw new Error('Only Superforms 3.x releases are supported.');
	}
	if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${pkg.version}`) {
		throw new Error('Release tag does not match package.json version.');
	}
}
const base = git(['merge-base', previous, main]);
appendFileSync(process.env.GITHUB_OUTPUT, `target=${target}\nprevious=${previous}\nbase=${base}\n`);
appendFileSync(
	process.env.GITHUB_STEP_SUMMARY,
	`Candidate: \`${target}\`\n\nCompatibility: \`${previous}\`\n\nCompatibility base: \`${base}\`\n`
);
