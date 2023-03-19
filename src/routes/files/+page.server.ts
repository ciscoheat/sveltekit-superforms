import { superValidate } from '$lib/server';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const userSchema = z.object({
  filename: z.string().min(1)
});

export const load = (async (event) => {
  const form = await superValidate(event, userSchema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const data = await event.request.formData();
    console.log('file: +page.server.ts:19 ~ default: ~ data:', data);
    const form = await superValidate(data, userSchema);
    console.log('FILE FORM', form);
    if (!form.valid) return fail(400, { form });

    const file = data.get('file');
    if (file instanceof File) {
      console.log(file.name, file);
    }

    return { form };
  }
} satisfies Actions;
