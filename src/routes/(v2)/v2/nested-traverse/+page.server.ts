import { nerveForm } from './schema.js';
import { z } from 'zod';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from '$lib/adapters/zod.js';
import type { Actions } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { parse } from 'devalue';

type DeficitTypeKey = keyof z.infer<typeof nerveForm>;
type NerveFormData = z.infer<typeof nerveForm>;

type Side = 'left' | 'right';

export async function load() {
	const findings = [
		{
			id: '1',
			key: 'nerve',
			nerve: 'c5',
			type: 'motor',
			grade: 25,
			side: 'left',
			comments: 'This is a comment'
		},
		{
			id: '2',
			key: 'nerve',
			nerve: 'c5',
			type: 'sensory',
			grade: 35,
			side: 'left',
			comments: 'This is a comment'
		}
	];

	const emptyData = {
		motor: { left: {}, right: {} },
		sensory: { left: {}, right: {} },
		dysesthesia: { left: {}, right: {} }
	};

	const formData = findings.reduce<NerveFormData>((acc, cur) => {
		if (cur.grade && cur.type && cur.side) {
			acc[cur.type as DeficitTypeKey][cur.side as Side].grade = cur.grade;
			acc[cur.type as DeficitTypeKey][cur.side as Side].comments = cur.comments || '';
		}
		return acc;
	}, emptyData);

	const form = await superValidate(formData, zod(nerveForm));
	return {
		form
	};
}

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.dir(parse(formData.get('__superform_json')), { depth: 10 });
		const form = await superValidate(formData, zod(nerveForm));
		console.dir(form, { depth: 10 }); //debug

		if (!form.valid) console.log('Not valid');
		if (!form.valid) return fail(400, { form });
		return { form };
	}
};
