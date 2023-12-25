import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { userSchema } from './schema';

import type { Actions, PageServerLoad } from './$types';

///// Load function /////

export const load: PageServerLoad = async () => {
  const form = await superValidate(userSchema);
  return { form };
};

///// Form actions /////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, userSchema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
