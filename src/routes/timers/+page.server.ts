import { message, superValidate } from '$lib/server';
import { schema } from './schema';
import { fail } from '@sveltejs/kit';

export const load = async () => {
  const form = await superValidate(schema);
  return { form };
};

export const actions = {
  default: async ({ request }) => {
    await new Promise((r) => setTimeout(r, 12000));
    const form = await superValidate(request, schema);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Posted OK!');
  }
};
