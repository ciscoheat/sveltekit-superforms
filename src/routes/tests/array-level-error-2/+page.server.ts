import { superValidate, message, setError } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

import type { Actions, PageServerLoad } from './$types';

/*
type FormType = {
	name: any;
	email: any;
	days: any;
};
*/

const raw = {
  name: z.string().min(1),
  email: z.string().email(),
  days: z.number().min(0).max(6).array().nonempty()
};

type FormTypeOk = typeof raw;

type FormType = {
  name: any;
  email: any;
  days: z.ZodArray<z.ZodNumber, 'atleastone'>;
};

const schema = z.object<FormType>({
  name: z.string().min(1),
  email: z.string().email(),
  days: z.number().min(0).max(6).array().nonempty()
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

    const data = form.data;

    if (!data.days?.length) {
      setError(form, 'days._errors', 'You have to select at least one day!');
    }

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
