import { describe, expect, it } from 'vitest';
import { superValidate } from '#lib/superValidate.js';
import { zod as zod4 } from '#lib/adapters/zod4.js';
import { typebox } from '#lib/adapters/typebox.js';
import { Type } from 'typebox';
import { z } from 'zod/v4';

describe('Issue #705 - zod4 boolean with default(true) when unchecked', () => {
	const schema = z.object({
		comment: z.string().min(1),
		consent: z.boolean().default(true)
	});

	it('initializes with default value true when no request data is provided', async () => {
		const form = await superValidate(zod4(schema));
		expect(form.data.consent).toBe(true);
	});

	it('parses an omitted checkbox in posted FormData as false', async () => {
		const formData = new FormData();
		formData.set('comment', 'Withdrawing consent');

		const form = await superValidate(formData, zod4(schema));
		expect(form.valid).toBe(true);
		expect(form.data).toEqual({
			comment: 'Withdrawing consent',
			consent: false
		});
	});

	it('parses empty string and "false" as false, and "on"/"true" as true', async () => {
		for (const [raw, expected] of [
			['', false],
			['false', false],
			['on', true],
			['true', true]
		] as const) {
			const formData = new FormData();
			formData.set('comment', 'Hello');
			formData.set('consent', raw);

			const form = await superValidate(formData, zod4(schema));
			expect(form.valid).toBe(true);
			expect(form.data.consent).toBe(expected);
		}
	});

	it('keeps default value true when omitted from URL search params', async () => {
		const url = new URL('https://example.com/?comment=Hello');
		const form = await superValidate(url, zod4(schema));
		expect(form.valid).toBe(true);
		expect(form.data.consent).toBe(true);
	});

	it('also parses omitted default(true) boolean as false for required JSON Schema fields (TypeBox)', async () => {
		const tbSchema = Type.Object({
			comment: Type.String({ minLength: 1 }),
			consent: Type.Boolean({ default: true })
		});

		const formData = new FormData();
		formData.set('comment', 'TypeBox unchecked');

		const form = await superValidate(formData, typebox(tbSchema));
		expect(form.valid).toBe(true);
		expect(form.data.consent).toBe(false);
	});
});
