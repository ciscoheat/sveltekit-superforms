import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { schema } from './schemas';

export const load = (async (event) => {
  const form = await superValidate(event, schema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const data = await event.request.formData();
    const form = await superValidate(event, schema);
    console.log('POST', form);

    return { form };
  }
} satisfies Actions;
