import type { LayoutServerLoad } from './$types.js';
import * as fs from 'fs/promises';

export const load = (async () => {
	const testDirs = (await fs.readdir('./src/routes/(v2)/v2', { withFileTypes: true }))
		.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
		.map((d) => d.name);

	return { testDirs };
}) satisfies LayoutServerLoad;
