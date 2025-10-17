import { describe, expect, test } from 'vitest';
import { superValidate } from '$lib/superValidate.js';
import { zod } from '$lib/adapters/zod4.js';
import { z } from 'zod/v4';

/*
 Issue #639 - Zod v4 error messages are always "Invalid Input" (or generic) in dev mode.
 This test documents the current behavior. Once the issue is fixed, update expectations.
*/

describe('Issue #639 - Zod v4 generic error messages in dev mode', () => {
	// Schema with explicit custom messages that should surface instead of generic ones.
	const schema = z.object({
		email: z.email(),
		age: z.number().int().min(18)
	});

	test('Failing email schema returns descriptive errors, not just "Invalid input"', async () => {
		const formData = new FormData();
		formData.set('email', 'xx'); // Too short & not email

		const form = await superValidate(formData, zod(schema, { error: z.config().localeError }));
		expect(form.valid).toBe(false);

		const emailErrors = form.errors.email ?? [];

		// At least one email error must exist.
		expect(emailErrors.length).toBeGreaterThan(0);

		// The bug: all errors collapse to "Invalid input" in dev mode.
		// After fix: error messages should be descriptive (mention "5 chars", "valid", "email", etc.).
		for (const error of emailErrors) {
			// Each error must NOT be the generic "Invalid input" string alone.
			expect(error.toLowerCase()).not.toBe('invalid input');

			// Error should contain meaningful details beyond just "invalid".
			const isDescriptive =
				error.includes('5') ||
				error.toLowerCase().includes('char') ||
				error.toLowerCase().includes('email') ||
				error.toLowerCase().includes('valid') ||
				error.toLowerCase().includes('string');

			expect(isDescriptive).toBe(true);
		}
	});

	test('Custom schema messages are preserved and shown correctly', async () => {
		// Schema with explicit custom error messages
		const customSchema = z.object({
			username: z.string().min(3, 'Username must be at least 3 characters long'),
			email: z.string().email('Please provide a valid email address'),
			age: z.number().int('Age must be a whole number').min(18, 'You must be at least 18 years old')
		});

		const formData = new FormData();
		formData.set('username', 'ab'); // Too short
		formData.set('email', 'not-an-email'); // Invalid format
		formData.set('age', '15'); // Below minimum

		const form = await superValidate(
			formData,
			zod(customSchema, { error: z.config().localeError })
		);
		expect(form.valid).toBe(false);

		const usernameErrors = form.errors.username ?? [];
		const emailErrors = form.errors.email ?? [];
		const ageErrors = form.errors.age ?? [];

		// Verify custom messages are present
		expect(usernameErrors).toContain('Username must be at least 3 characters long');
		expect(emailErrors).toContain('Please provide a valid email address');
		expect(ageErrors).toContain('You must be at least 18 years old');

		// Ensure NO generic "Invalid input" messages appear
		const allErrors = [...usernameErrors, ...emailErrors, ...ageErrors];
		for (const error of allErrors) {
			expect(error.toLowerCase()).not.toBe('invalid input');
		}
	});
});
