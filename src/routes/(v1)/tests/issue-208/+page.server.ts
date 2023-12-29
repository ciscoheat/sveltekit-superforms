import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { UserType, NumberType } from './UserType';

const schema = z.object({
  type: z.nativeEnum(UserType),
  number: z.nativeEnum(NumberType)
});

///// Load //////////////////////////////////////////////////////////

export const load: PageServerLoad = async () => {
  const form = await superValidate(schema);
  return { form };
};

///// Form actions //////////////////////////////////////////////////

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    console.log(
      '🚀 ~ file: +page.server.ts:25 ~ default: ~ formData:',
      formData
    );
    const form = await superValidate(formData, schema);

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });

    return message(form, form.data.type + ' posted ' + form.data.number);
  }
};
