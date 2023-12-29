import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
//import type { z } from 'zod';
import { schema, schema2 } from './schemas';

export const load = (async () => {
  const form = await superValidate(schema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const form = await superValidate(formData, schema);
    console.log('POST', form);

    return { form };
  }
} satisfies Actions;
