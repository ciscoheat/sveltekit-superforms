import type { Actions, PageServerLoad } from './$types';
import { schema } from './schema';
import { superValidate } from '$lib/server';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
  const form = await superValidate({ ids: { id: [1, 2, 3, 4] } }, schema, {
    noErrors: true
  });
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, schema);
    if (!form.valid) return fail(400, { form });
    form.message = 'It works!';
    return { form };
  }
} satisfies Actions;
