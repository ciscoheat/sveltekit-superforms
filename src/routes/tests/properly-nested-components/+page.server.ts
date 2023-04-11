import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { schema } from './schemas';

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

    return { form };
  }
} satisfies Actions;
