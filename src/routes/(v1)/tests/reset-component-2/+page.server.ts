import { superValidate, message } from '$lib/server';
import { registerSchema, profileSchema } from './schema';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const load = async () => {
  // Server API:
  const regForm = await superValidate(registerSchema);
  const profileForm = await superValidate(profileSchema);

  return { regForm, profileForm };
};

export const actions = {
  register: async ({ request }) => {
    const regForm = await superValidate(request, registerSchema);

    console.log('register', regForm);

    if (!regForm.valid) return fail(400, { regForm });

    return message(regForm, {
      text: 'Form "register" posted successfully!'
    });
  },

  edit: async ({ request }) => {
    const profileForm = await superValidate(request, profileSchema);

    console.log('edit', profileForm);

    if (!profileForm.valid) return fail(400, { profileForm });

    return message(profileForm, {
      text: 'Form "profile" posted successfully!'
    });
  }
} satisfies Actions;
