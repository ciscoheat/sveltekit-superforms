import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { RegisterSchema } from './schemas';

export const load = (async (event) => {
  const form = await superValidate(event, RegisterSchema);
  return { form };
}) satisfies PageServerLoad;

type FormSubmitResultMessage = {
  status: 'error' | 'success';
  text: string;
};

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const form = await superValidate<
      typeof RegisterSchema,
      FormSubmitResultMessage
    >(data, RegisterSchema);
    console.log('POST', form);

    return { form };
  }
} satisfies Actions;
