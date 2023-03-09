import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';

enum Fruits {
  Apple,
  Banana
}

enum FruitsStr {
  Apple = 'Apple',
  Banana = 'Banana'
}

export const _dataTypeForm = z.object({
  string: z.string().min(2).default('Shigeru'),
  email: z.string().email(),
  bool: z.boolean(),
  agree: z.literal(true).default(false as true),
  number: z.number(),
  proxyNumber: z.number().min(10).default(0),
  nullableString: z.string().nullable(),
  nullishString: z.string().nullish(),
  optionalString: z.string().optional(),
  proxyString: z.string(),
  trimmedString: z.string().trim(),
  numberArray: z.number().int().array().min(3),
  date: z.date().optional().default(new Date()),
  coercedNumber: z.coerce.number().default(0).optional(),
  coercedDate: z.coerce.date().optional(),
  nativeEnumInt: z.nativeEnum(Fruits).default(Fruits.Apple),
  nativeEnumString: z
    .nativeEnum({ GRAY: 'GRAY', GREEN: 'GREEN' })
    .default('GREEN'),
  nativeEnumString2: z.nativeEnum(FruitsStr).default(FruitsStr.Banana)
});

export const load = (async (event) => {
  const form = await superValidate(event, _dataTypeForm);
  console.log('🚀 ~ LOAD', form);

  return { form };
}) satisfies PageServerLoad;

export const actions = {
  form: async (event) => {
    const formData = await event.request.formData();
    console.log('🚀 ~ POST', formData);

    const form = await superValidate(
      formData,
      _dataTypeForm.extend({ coercedDate: z.coerce.date() })
    );
    console.log('🚀 ~ FORM', form);

    if (!form.valid) {
      setError(form, 'email', '[Email error]', { overwrite: true });
      return fail(400, { form });
    }

    await new Promise((resolve) => setTimeout(resolve, form.data.number));

    form.message = 'Post successful!';
    return { form };
  }
} satisfies Actions;
