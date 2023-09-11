import { superValidate, message } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

///// Form actions /////

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
