import { readdirSync, existsSync } from 'fs';

const path = './dist/adapters/';

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
