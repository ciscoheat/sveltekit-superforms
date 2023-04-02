import type { PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { exampleDto } from './schemas';

export const load = (async () => {
  const form = await superValidate(null, exampleDto);
  return { form };
}) satisfies PageServerLoad;
