import { describe, it, expect } from 'vitest';
import { superValidate } from '$lib/superValidate.js';
import { zod as zod3 } from '$lib/adapters/zod.js';
import { zod as zod4 } from '$lib/adapters/zod4.js';
import { z as z3 } from 'zod/v3';
import { z as z4 } from 'zod/v4';

describe('Issue #633 - Boolean default value with URL vs FormData validation', () => {
	describe('Zod v3', () => {
		it('should return true for boolean field with .default(true) when validating empty URL', async () => {
			// Schema with boolean default set to true
			const formSchema = z3.object({
				orderby: z3.boolean().default(true)
			});

			// Create URL with no searchParams
			const url = new URL('http://test.com');

			// Validate URL with schema
			const form = await superValidate(url, zod3(formSchema));

			// The boolean field should default to true, not false
			expect(form.data.orderby).toBe(true);
		});

		it('should respect explicit false value in URL searchParams', async () => {
			// Schema with boolean default set to true
			const formSchema = z3.object({
				orderby: z3.boolean().default(true)
			});

			// Create URL with orderby=false
			const url = new URL('http://test.com?orderby=false');

			// Validate URL with schema
			const form = await superValidate(url, zod3(formSchema));

			// The explicit false value should be preserved
			expect(form.data.orderby).toBe(false);
		});

		it('should use true default when URL has other params but not orderby', async () => {
			// Schema with boolean default set to true
			const formSchema = z3.object({
				orderby: z3.boolean().default(true),
				search: z3.string().optional()
			});

			// Create URL with other params but not orderby
			const url = new URL('http://test.com?search=test');

			// Validate URL with schema
			const form = await superValidate(url, zod3(formSchema));

			// The boolean field should default to true
			expect(form.data.orderby).toBe(true);
			expect(form.data.search).toBe('test');
		});

		// FormData tests - different behavior expected
		describe('FormData validation', () => {
			it('should return false for boolean field with .default(true) when validating empty FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z3.object({
					orderby: z3.boolean().default(true)
				});

				// Create empty FormData
				const formData = new FormData();

				// Validate FormData with schema
				const form = await superValidate(formData, zod3(formSchema));

				// For FormData, missing boolean should return false (HTML form behavior)
				expect(form.data.orderby).toBe(false);
			});

			it('should respect explicit false value in FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z3.object({
					orderby: z3.boolean().default(true)
				});

				// Create FormData with orderby=false
				const formData = new FormData();
				formData.set('orderby', 'false');

				// Validate FormData with schema
				const form = await superValidate(formData, zod3(formSchema));

				// The explicit false value should be preserved
				expect(form.data.orderby).toBe(false);
			});

			it('should return true for explicit true value in FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z3.object({
					orderby: z3.boolean().default(true)
				});

				// Create FormData with orderby=true
				const formData = new FormData();
				formData.set('orderby', 'true');

				// Validate FormData with schema
				const form = await superValidate(formData, zod3(formSchema));

				// The explicit true value should be preserved
				expect(form.data.orderby).toBe(true);
			});

			it('should return false when FormData has other fields but not orderby', async () => {
				// Schema with boolean default set to true
				const formSchema = z3.object({
					orderby: z3.boolean().default(true),
					search: z3.string().optional()
				});

				// Create FormData with other fields but not orderby
				const formData = new FormData();
				formData.set('search', 'test');

				const adapter = zod3(formSchema);
				// console.log('===ZOD3===');
				// console.dir(adapter.jsonSchema, { depth: 10 }); //debug

				// Validate FormData with schema
				const form = await superValidate(formData, adapter);

				// For FormData, missing boolean should return false (HTML form behavior)
				expect(form.data.orderby).toBe(false);
				expect(form.data.search).toBe('test');
			});
		});
	});

	describe('Zod v4', () => {
		it('should return true for boolean field with .default(true) when validating empty URL', async () => {
			// Schema with boolean default set to true
			const formSchema = z4.object({
				orderby: z4.boolean().default(true)
			});

			// Create URL with no searchParams
			const url = new URL('http://test.com');

			// Validate URL with schema
			const form = await superValidate(url, zod4(formSchema));

			// The boolean field should default to true, not false
			expect(form.data.orderby).toBe(true);
		});

		it('should respect explicit false value in URL searchParams', async () => {
			// Schema with boolean default set to true
			const formSchema = z4.object({
				orderby: z4.boolean().default(true)
			});

			// Create URL with orderby=false
			const url = new URL('http://test.com?orderby=false');

			// Validate URL with schema
			const form = await superValidate(url, zod4(formSchema));

			// The explicit false value should be preserved
			expect(form.data.orderby).toBe(false);
		});

		it('should use true default when URL has other params but not orderby', async () => {
			// Schema with boolean default set to true
			const formSchema = z4.object({
				orderby: z4.boolean().default(true),
				search: z4.string().optional()
			});

			// Create URL with other params but not orderby
			const url = new URL('http://test.com?search=test');

			// Validate URL with schema
			const form = await superValidate(url, zod4(formSchema));

			// The boolean field should default to true
			expect(form.data.orderby).toBe(true);
			expect(form.data.search).toBe('test');
		});

		// FormData tests - different behavior expected
		// This is a breaking change between Zod 3 and 4:
		// See https://github.com/colinhacks/zod/issues/4883
		describe('FormData validation', () => {
			it('should return true for boolean field with .default(true) when validating empty FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z4.object({
					orderby: z4.boolean().default(true)
				});

				// Create empty FormData
				const formData = new FormData();

				// Validate FormData with schema
				const form = await superValidate(formData, zod4(formSchema));

				// For FormData, missing boolean should return false (HTML form behavior)
				expect(form.data.orderby).toBe(true);
			});

			it('should respect explicit false value in FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z4.object({
					orderby: z4.boolean().default(true)
				});

				// Create FormData with orderby=false
				const formData = new FormData();
				formData.set('orderby', 'false');

				// Validate FormData with schema
				const form = await superValidate(formData, zod4(formSchema));

				// The explicit false value should be preserved
				expect(form.data.orderby).toBe(false);
			});

			it('should return true for explicit true value in FormData', async () => {
				// Schema with boolean default set to true
				const formSchema = z4.object({
					orderby: z4.boolean().default(true)
				});

				// Create FormData with orderby=true
				const formData = new FormData();
				formData.set('orderby', 'true');

				// Validate FormData with schema
				const form = await superValidate(formData, zod4(formSchema));

				// The explicit true value should be preserved
				expect(form.data.orderby).toBe(true);
			});

			// This is a breaking change between Zod 3 and 4:
			// See https://github.com/colinhacks/zod/issues/4883
			it('should return true when FormData has other fields but not orderby', async () => {
				// Schema with boolean default set to true
				const formSchema = z4.object({
					orderby: z4.boolean().default(true),
					search: z4.string().optional()
				});

				// Create FormData with other fields but not orderby
				const formData = new FormData();
				formData.set('search', 'test');

				const adapter = zod4(formSchema);
				// console.log('===ZOD4===');
				// console.dir(adapter.jsonSchema, { depth: 10 }); //debug

				// Validate FormData with schema
				const form = await superValidate(formData, adapter);

				// For FormData, missing boolean should return false (HTML form behavior)
				expect(form.data.orderby).toBe(true);
				expect(form.data.search).toBe('test');
			});
		});
	});
});
