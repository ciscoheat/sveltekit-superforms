import { superValidate, message, setError } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { schema } from './schema';
import type { Actions, PageServerLoad } from './$types';

///// Load function /////

export const load: PageServerLoad = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions /////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    const data = form.data;

    if (!data.days?.length) {
      setError(form, 'days._errors', 'You have to select at least one day!');
    }

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
