import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import type { z } from 'zod';
import { schema, schemaToStr } from './schema';

export const load = (async ({ url }) => {
  //console.log('GET /dates', new Date());

  const date = new Date('1984-09-02');

  const data: z.infer<typeof schema> = {
    plain: date,
    str: date.toISOString(),
    coerced: date,
    proxy: date,
    proxyCoerce: date
  };

  const form = await superValidate<typeof schema>(
    url.searchParams.has('empty') ? null : data,
    schema
  );
  //console.log('load:', form.data);

  return { form, log: schemaToStr(form.data) };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ request }) => {
    console.log('--- POST -------------------------------------------');
    const data = await request.formData();
    console.log(data);

    const form = await superValidate(data, schema);

    console.log(form.data);

    return { form, log: schemaToStr(form.data) };
  }
} satisfies Actions;
