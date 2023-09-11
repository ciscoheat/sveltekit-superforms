import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';

import { schema } from './schema';

///// Load function /////

export const load = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions /////

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
