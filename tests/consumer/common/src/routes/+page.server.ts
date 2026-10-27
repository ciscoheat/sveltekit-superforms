import { fail, superValidate } from 'sveltekit-superforms';
import { actionResult } from 'sveltekit-superforms/server';
import { zod as zod4 } from 'sveltekit-superforms/adapters/zod4';
import { schema } from '../lib/schema.js';
import type { Actions, PageServerLoad } from './$types';

const transport = {
	Date: {
		encode: (value: unknown) => value instanceof Date && value.toISOString(),
		decode: (value: string) => new Date(value)
	}
};

export const load = (async () => ({
	form: await superValidate(zod4(schema), { transport })
})) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(schema), { transport });
		if (!form.valid) return fail(400, { form });
		return { form };
	}
} satisfies Actions;

const response: Response = actionResult('success', { ok: true }, { transport });
void response;
