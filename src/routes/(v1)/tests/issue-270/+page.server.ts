import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
  myString: z.string().min(10),
  myArray: z
    .number()
    .array()
    .default([-1])
    .refine((arg) => arg.every((n) => n >= 0), 'All numbers must >= 0')
});

///// Load function /////

export const load: PageServerLoad = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions /////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
