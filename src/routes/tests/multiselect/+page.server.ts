import { fail } from '@sveltejs/kit';
import { message, superValidate } from '$lib/server';
import type { Actions, PageServerLoad } from './$types';

import { formSchema } from './schemas';

export const load: PageServerLoad = async () => {
  const form = await superValidate(formSchema);

  return { form };
};

export const actions: Actions = {
  default: async (request) => {
    const form = await superValidate(request, formSchema);
    console.log(form.valid);
    if (!form.valid) {
      return fail(400, { form });
    }

    return message(form, 'Posted!');
  }
};
