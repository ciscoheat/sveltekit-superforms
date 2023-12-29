import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from '$lib/server';
import { editPageSchema } from './schemas';
import { fail } from '@sveltejs/kit';

///// Load //////////////////////////////////////////////////////////

export const load: PageServerLoad = async () => {
  const form = await superValidate(editPageSchema);
  return { form };
};

///// Form actions //////////////////////////////////////////////////

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, editPageSchema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, 'Form posted successfully!');
  }
};
