import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { schema } from './schema';
import { message, superValidate } from '$lib/server';

export const load = (async () => {
  const form = await superValidate(schema);

  return { form };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);
    console.log('POST', form);

    if (!form.valid) {
      return fail(400, { form });
    }

    return message(form, 'Success');
  }
};
