import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import { parse } from 'devalue';

export const _dataTypeForm = z.object({
  string: z.string().min(2).default('Shigeru'),
  email: z.string().email(),
  bool: z.boolean(),
  number: z.number(),
  proxyNumber: z.number().min(10).default(0),
  nullableString: z.string().nullable(),
  nullishString: z.string().nullish(),
  optionalString: z.string().optional(),
  proxyString: z.string(),
  trimmedString: z.string().trim(),
  numberArray: z.number().int().array().min(3),
  date: z.date().default(new Date()),
  coercedNumber: z.coerce.number().default(0),
  coercedDate: z.coerce.date().default(new Date())
});

export const load = (async (event) => {
  const form = await superValidate(event, _dataTypeForm);
  console.log('🚀 ~ LOAD', form);

  return { form };
}) satisfies PageServerLoad;

export const actions = {
  form: async (event) => {
    const formData = await event.request.formData();
    const form = await superValidate(formData, _dataTypeForm);
    console.log('🚀 ~ POST', form);

    if (!form.valid) return fail(400, { form });

    await new Promise((resolve) => setTimeout(resolve, form.data.number));

    form.message = 'Form posted!';
    return { form };
  }
} satisfies Actions;
