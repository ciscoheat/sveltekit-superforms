import type { PageLoad } from './$types';

export const load = (async ({ data }) => {
  return data;
}) satisfies PageLoad;
