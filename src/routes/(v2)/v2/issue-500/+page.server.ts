// +page.server.ts

import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import {
	inviteUserToGroupSchema,
	modifyGroupAccessSchema,
	fixedModifyGroupAccessSchema
} from './schema.js';

const group = {
	users: [
		{
			username: 'user1'
		}
	]
};

export const load: PageServerLoad = async () => {
	return { group };
};

export const actions: Actions = {
	invite: async ({ request }) => {
		const form = await superValidate(request, zod(inviteUserToGroupSchema));

		if (!form.valid) return fail(400, { form });

		group.users.push({ username: form.data.username });

		return message(form, 'Form posted successfully!');
	},
	modify: async ({ request }) => {
		const form = await superValidate(request, zod(modifyGroupAccessSchema));

		if (!form.valid) return fail(400, { form });

		const removedUsernames = form.data.users.filter((u) => u.remove).map((u) => u.username);

		group.users = group.users.filter((u) => removedUsernames.includes(u.username));

		return message(form, 'Form posted successfully!');
	},
	['fixed-modify']: async ({ request }) => {
		const form = await superValidate(request, zod(fixedModifyGroupAccessSchema));

		if (!form.valid) return fail(400, { form });

		const removedUsernames = form.data.users.filter((u) => u.removed).map((u) => u.username);

		group.users = group.users.filter((u) => removedUsernames.includes(u.username));

		return message(form, 'Form posted successfully!');
	}
};
