import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/server/index.js';
import { fail } from '$lib/superValidate.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		if (form.data.dir == 'west') {
			return { form, code: form.data.dir.toUpperCase() };
		}

		if (form.data.dir) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const f = form as any;
			// Testing to add files that should be removed by fail
			f.message = new File(['123132123'], 'test.txt');
			f.data.extra = new File(['123132123'], 'test2.txt');
			return fail(400, { form, code: form.data.dir.toUpperCase() });
		} else {
			return { form, fail: true };
		}
	}
};
