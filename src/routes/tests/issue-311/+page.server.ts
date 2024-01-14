import { superValidate } from '$lib/server';
import { schema } from './schema';

import type { PageServerLoad } from './$types';

///// Load function /////

export const load: PageServerLoad = async () => {
  const form = await superValidate(schema);
  return { form };
};
