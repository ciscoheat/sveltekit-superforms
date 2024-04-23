import { nerveForm } from './schema.js';
import { z } from 'zod';
import { message, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import type { Actions } from '@sveltejs/kit';

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
		// @ts-expect-error Incomplete type, should be undefined
	}, emptyData);

	// @ts-expect-error Incomplete type, should be undefined
	const form = await superValidate(formData, zod(nerveForm));
	return {
		form
	};
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(nerveForm));

		if (!form.valid) return message(form, 'Not valid', { status: 400 });
		return message(form, 'OK');
	}
};
