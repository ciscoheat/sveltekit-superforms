import { superValidate } from '$lib/server';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

// See https://zod.dev/?id=primitives for schema syntax
const schema = z.object({
  name: z.string().default('Hello world!'),
  email: z.string().email()
});

export const load = (async (event) => {
  const form = await superValidate(event, schema);
  // Always return { form } and you'll be fine.
  return { form };
}) satisfies PageServerLoad;
