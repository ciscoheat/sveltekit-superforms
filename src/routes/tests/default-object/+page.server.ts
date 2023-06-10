import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from '$lib/server';
import { postSchema } from './schema';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
  const form = await superValidate(postSchema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const form = await superValidate(formData, postSchema);

    console.dir(form, { depth: 6 });

    if (!form.valid) return fail(400, { form });

    return message(form, 'Posted OK!');
  }
} satisfies Actions;
