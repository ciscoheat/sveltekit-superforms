import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from '$lib/server';
import { schema } from './schemas';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
  const form = await superValidate(schema, {
    errors: true
  });
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const form = await superValidate(formData, schema);
    console.dir(form, { depth: 5 });

    if(!form.valid) return fail(400, {form})

    return message(form, 'Posted!');
  }
} satisfies Actions;
