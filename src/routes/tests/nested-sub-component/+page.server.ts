import type { PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { schemaDto } from './schemas';

export const load = (async () => {
  const form = await superValidate(null, schemaDto);
  return { form };
}) satisfies PageServerLoad;
