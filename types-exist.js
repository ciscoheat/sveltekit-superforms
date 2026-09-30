import { readdirSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const path = './dist/adapters/';
const publicAdapters = [
	'arktype',
	'classvalidator',
	'effect',
	'joi',
	'schemasafe',
	'standard',
	'superform',
	'superstruct',
	'typebox',
	'valibot',
	'vine',
	'yup',
	'zod',
	'zod4'
];

function assert(condition, message) {
	if (!condition) {
		console.error(message);
		process.exit(1);
	}
}

// Sometimes, valibot types doesn't generate
const js = readdirSync(path)
	.filter((f) => f.endsWith('.js'))
	.map((f) => path + f.slice(0, -2) + 'd.ts');

// The other file using the Prettify type
js.push('./dist/client/proxies.d.ts');

for (const file of js) {
	if (!existsSync(file)) {
		console.error('Missing type definition:', file);
		process.exit(1);
	}
}

for (const adapter of publicAdapters) {
	const distFile = `./dist/adapters/${adapter}.js`;
	const typesFile = `./dist/adapters/${adapter}.d.ts`;

	for (const exportName of [`./adapters/${adapter}`, `./adapters/${adapter}.js`]) {
		const entry = pkg.exports[exportName];

		assert(entry, `Missing package export: ${exportName}`);
		assert(entry.types === typesFile, `Invalid types export for ${exportName}`);
		assert(entry.svelte === distFile, `Invalid svelte export for ${exportName}`);
		assert(entry.default === distFile, `Invalid default export for ${exportName}`);
	}

	for (const typeVersionName of [`adapters/${adapter}`, `adapters/${adapter}.js`]) {
		const entry = pkg.typesVersions['>4.0'][typeVersionName];

		assert(entry?.[0] === typesFile, `Invalid typesVersions entry for ${typeVersionName}`);
	}
}
