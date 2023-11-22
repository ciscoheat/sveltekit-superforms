import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const schema = z
  .object({
    known_1: z.string().trim(),
    known_2: z.string().trim()
  })
  .catchall(z.number().int().min(1));

export const load = (async () => {
  const form = superValidate(schema);
  return { form };
}) satisfies PageServerLoad;

export const actions: Actions = {
  async default(event) {
    console.log('--- POST -------------------------------------------');
    const data = await event.request.formData();
    console.log(data);

    const form = await superValidate(data, schema);

    console.log(form.data);

    return { form };
  }
};
