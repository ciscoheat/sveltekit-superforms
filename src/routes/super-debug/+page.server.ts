import { z } from 'zod';
import { superValidate } from '$lib/server';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { users, userId, userSchema } from '$lib/users';

const schema = z.object({
    full_name: z.string().min(1, "Full Name is required."),
    email: z.string().min(1, "Email is required.").email("Email is invalid."),
    phone_number: z.string().min(1, "Phone number is required."),
});

export const load = (async ({ request }) => {
    const form = await superValidate(request, schema);

    return { form };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const form = await superValidate(formData, schema);
        if (!form.valid) return fail(400, { form });

        return { form };
    }
} satisfies Actions;