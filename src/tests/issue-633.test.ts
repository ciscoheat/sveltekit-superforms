import { describe, it, expect } from 'vitest';
import { superValidate } from '$lib/superValidate.js';
import { zod } from '$lib/adapters/zod.js';
import { z } from 'zod/v3';

describe('Issue #633 - Boolean default value with URL vs FormData validation', () => {
	it('should return true for boolean field with .default(true) when validating empty URL', async () => {
		// Schema with boolean default set to true
		const formSchema = z.object({
			orderby: z.boolean().default(true)
		});

		// Create URL with no searchParams
		const url = new URL('http://test.com');

		// Validate URL with schema
		const form = await superValidate(url, zod(formSchema));

		// The boolean field should default to true, not false
		expect(form.data.orderby).toBe(true);
	});

	it('should respect explicit false value in URL searchParams', async () => {
		// Schema with boolean default set to true
		const formSchema = z.object({
			orderby: z.boolean().default(true)
		});

		// Create URL with orderby=false
		const url = new URL('http://test.com?orderby=false');

		// Validate URL with schema
		const form = await superValidate(url, zod(formSchema));

		// The explicit false value should be preserved
		expect(form.data.orderby).toBe(false);
	});

	it('should use true default when URL has other params but not orderby', async () => {
		// Schema with boolean default set to true
		const formSchema = z.object({
			orderby: z.boolean().default(true),
			search: z.string().optional()
		});

		// Create URL with other params but not orderby
		const url = new URL('http://test.com?search=test');

		// Validate URL with schema
		const form = await superValidate(url, zod(formSchema));

		// The boolean field should default to true
		expect(form.data.orderby).toBe(true);
		expect(form.data.search).toBe('test');
	});

	// FormData tests - different behavior expected
	describe('FormData validation', () => {
		it('should return false for boolean field with .default(true) when validating empty FormData', async () => {
			// Schema with boolean default set to true
			const formSchema = z.object({
				orderby: z.boolean().default(true)
			});

			// Create empty FormData
			const formData = new FormData();

			// Validate FormData with schema
			const form = await superValidate(formData, zod(formSchema));

			// For FormData, missing boolean should return false (HTML form behavior)
			expect(form.data.orderby).toBe(false);
		});

		it('should respect explicit false value in FormData', async () => {
			// Schema with boolean default set to true
			const formSchema = z.object({
				orderby: z.boolean().default(true)
			});

			// Create FormData with orderby=false
			const formData = new FormData();
			formData.set('orderby', 'false');

			// Validate FormData with schema
			const form = await superValidate(formData, zod(formSchema));

			// The explicit false value should be preserved
			expect(form.data.orderby).toBe(false);
		});

		it('should return true for explicit true value in FormData', async () => {
			// Schema with boolean default set to true
			const formSchema = z.object({
				orderby: z.boolean().default(true)
			});

			// Create FormData with orderby=true
			const formData = new FormData();
			formData.set('orderby', 'true');

			// Validate FormData with schema
			const form = await superValidate(formData, zod(formSchema));

			// The explicit true value should be preserved
			expect(form.data.orderby).toBe(true);
		});

		it('should return false when FormData has other fields but not orderby', async () => {
			// Schema with boolean default set to true
			const formSchema = z.object({
				orderby: z.boolean().default(true),
				search: z.string().optional()
			});

			// Create FormData with other fields but not orderby
			const formData = new FormData();
			formData.set('search', 'test');

			// Validate FormData with schema
			const form = await superValidate(formData, zod(formSchema));

			// For FormData, missing boolean should return false (HTML form behavior)
			expect(form.data.orderby).toBe(false);
			expect(form.data.search).toBe('test');
		});
	});
});
