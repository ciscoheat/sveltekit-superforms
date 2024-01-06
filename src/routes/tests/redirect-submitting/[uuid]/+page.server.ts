import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from '$lib/server';
import { z } from 'zod';
import { v4 } from 'uuid';

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const schema = z.object({
  name: z.string().default('Hello world!')
});

export const actions = {
  default: async ({ request }) => {
    await sleep(1000);
    const form = await superValidate(request, schema);
    console.log('POST', form);

    // Convenient validation check:
    if (!form.valid) {
      // Again, return { form } and things will just work.
      return fail(400, { form });
    }

    // TODO: Do something with the validated form.data

    // Yep, return { form } here too
    // return { form }
    throw redirect(303, `/tests/redirect-submitting/${v4()}`);
  }
};
