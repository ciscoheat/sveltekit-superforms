import { fail } from '@sveltejs/kit';
import { message, superValidate } from '$lib/server';
import type { Actions, PageServerLoad } from './$types';
import { schema, type Message } from './utils';

///// Load function /////

export const load: PageServerLoad = async () => {
  const form = await superValidate<typeof schema, Message>(schema);
  return { form };
};

///// Form actions /////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate<typeof schema, Message>(
      request,
      schema
    );

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, {
      type: 'success',
      text: 'Form posted successfully!'
    });
  }
};
