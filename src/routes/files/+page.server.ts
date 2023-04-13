import { superValidate } from '$lib/server';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const userSchema = z.object({
  filename: z.string().min(1)
});

export const load = (async () => {
  const form = await superValidate(userSchema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const data = await event.request.formData();
    console.log('Formdata', data);
    const form = await superValidate(data, userSchema);
    console.log('Form', form);
    if (!form.valid) return fail(400, { form });

    const file = data.get('file');
    if (file instanceof File) {
      console.log(file.name, file);
      form.message = 'Uploaded: ' + file.name
    } else {
      form.message = 'No file uploaded.'
    }

    return { form };
  }
} satisfies Actions;
