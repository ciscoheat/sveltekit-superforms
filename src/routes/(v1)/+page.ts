import type { PageLoad } from './$types.js';

export const load = (async ({ data }) => {
	return data;
}) satisfies PageLoad;
