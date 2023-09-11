import { message, superValidate } from '$lib/server';
import { schema } from './schema';
import { fail } from '@sveltejs/kit';

export const load = async () => {
  const form = await superValidate(schema);
  return { form };
};

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    console.log(formData);

    const form = await superValidate(formData, schema);
    console.log('POST', form);

    if (!form.valid) {
      form.message = 'Failed on server.';
      return fail(400, { form });
    }

    return message(form, 'Posted OK!');
  }
};
