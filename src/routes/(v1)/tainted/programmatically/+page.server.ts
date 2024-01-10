import { superValidate, message } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z
	.object({
		scoops: z.number().int().min(1).default(1),
		flavours: z
			.string()
			.array()
			.min(1, 'Please select at least one flavour')
			.default(['Mint choc chip'])
	})
	.refine((data) => data.flavours.length <= data.scoops, {
		message: "Can't order more flavours than scoops!",
		path: ['flavours']
	});

///// Load //////////////////////////////////////////////////////////

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions //////////////////////////////////////////////////

function join(flavours: string[]) {
	if (flavours.length === 1) return flavours[0];
	return `${flavours.slice(0, -1).join(', ')} and ${flavours[flavours.length - 1]}`;
}

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(
			form,
			`You ordered ${form.data.scoops} ${form.data.scoops === 1 ? 'scoop' : 'scoops'}
		of ${join(form.data.flavours)}`
		);
	}
};
