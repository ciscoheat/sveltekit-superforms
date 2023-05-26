import { setError, superValidate } from '$lib/server';
import type { Validation } from '$lib/index';
import { fail } from '@sveltejs/kit';
import { schema } from './schema';

export const load = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions //////////////////////////////////////////////////

function stripPassword(form: Validation<typeof schema>) {
  // comment out password clearing and form error works again
  form.data.password = '';
  form.data.confirmedPassword = '';
  return form;
}

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const form = await superValidate(formData, schema);
    console.log('🚀 ~ file: +page.server.ts:24 ~ default: ~ form:', form);

    if (!form.valid) return fail(400, { form: stripPassword(form) });

    if (form.data.name === 'form') {
      return setError(
        stripPassword(form),
        // @ts-expect-error Backwards compatibility for testing
        null,
        'This is a sticky form error and it stays until the form gets submitted again'
      );
    }

    return { form: stripPassword(form) };
  }
};
