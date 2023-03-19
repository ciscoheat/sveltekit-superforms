import type { Actions, PageServerLoad } from './$types';
import { schema } from './schema';
import { superValidate } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

const defaultData = { ids: { id: [1, 2, 3, 4] } };

export const load = (async (event) => {
  const form = await superValidate(defaultData, schema, {
    noErrors: true
  });
  return { form, useZod: event.url.searchParams.has('zod') };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, schema);

    if (!form.valid) return fail(400, { form });
    form.message = 'It works';

    if (form.data.redirect) {
      throw redirect(
        { type: 'success', message: 'It works (redirected)' },
        event
      );
    }

    // Send invalid data but no errors, to see if the
    // server errors trumps the client-side validation.
    form.data = defaultData;
    return { form };
  }
} satisfies Actions;
