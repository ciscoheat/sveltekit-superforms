import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
  name: z.string().min(1).default('TEST'),
  email: z.string().email()
});

///// Load //////////////////////////////////////////////////////////

export const load: PageServerLoad = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions //////////////////////////////////////////////////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
