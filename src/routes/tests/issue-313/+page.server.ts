import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { schema } from './schema';

import type { Actions, PageServerLoad } from './$types';

///// Load function /////

export const load: PageServerLoad = async () => {
  const loginForm = await superValidate(schema);
  return { loginForm };
};

///// Form actions /////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    console.log(form.data);
    if (form.data.name === 'fail') return fail(401, { form, isFail: true });

    return message(form, 'Form posted successfully!');
  }
};
