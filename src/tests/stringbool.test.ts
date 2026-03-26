import { describe, it, expect } from 'vitest';
import { superValidate } from '$lib/superValidate.js';
import { zod } from '$lib/adapters/zod4.js';
import { z } from 'zod/v4';

describe('z.stringbool() support', () => {
	const schema = z.object({
		acceptTerms: z.stringbool({
			truthy: ['true'],
			falsy: ['false'],
			case: 'sensitive'
		})
	});

	it('should validate "true" string correctly', async () => {
		const formData = new FormData();
		formData.set('acceptTerms', 'true');

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(true);
		expect(result.data.acceptTerms).toBe(true);
	});

	it('should validate "false" string correctly', async () => {
		const formData = new FormData();
		formData.set('acceptTerms', 'false');

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(true);
		expect(result.data.acceptTerms).toBe(false);
	});

	it('should fail validation for invalid string values', async () => {
		const formData = new FormData();
		formData.set('acceptTerms', 'yes');

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(false);
		expect(result.errors.acceptTerms).toBeDefined();
	});

	it('should fail validation for non-true/false values (case sensitive)', async () => {
		const formData = new FormData();
		formData.set('acceptTerms', 'True'); // Capital T should fail

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(false);
		expect(result.errors.acceptTerms).toBeDefined();
	});

	it('should handle empty string correctly', async () => {
		const formData = new FormData();
		formData.set('acceptTerms', '');

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(false);
		expect(result.errors.acceptTerms).toBeDefined();
	});

	it('should generate JSON schema with stringbool format', async () => {
		const adapter = zod(schema);
		expect(adapter.jsonSchema).toBeDefined();
		expect(adapter.jsonSchema?.properties?.acceptTerms).toBeDefined();

		const acceptTermsSchema = adapter.jsonSchema?.properties?.acceptTerms;
		if (typeof acceptTermsSchema === 'object' && acceptTermsSchema !== null) {
			expect(acceptTermsSchema.type).toBe('string');
			expect(acceptTermsSchema.format).toBe('stringbool');
		}
	});

	it('should not coerce like regular booleans', async () => {
		// Regular boolean coercion would make any non-"false" value truthy
		// stringbool should only accept "true" or "false"
		const formData = new FormData();
		formData.set('acceptTerms', 'anything');

		const result = await superValidate(formData, zod(schema));
		// With stringbool, this should FAIL validation
		expect(result.valid).toBe(false);
		expect(result.errors.acceptTerms).toBeDefined();
	});
});

describe('z.stringbool() with different truthy/falsy values', () => {
	const schema = z.object({
		status: z.stringbool({
			truthy: ['yes', 'on', '1'],
			falsy: ['no', 'off', '0'],
			case: 'insensitive'
		})
	});

	it('should validate custom truthy values', async () => {
		const testCases = ['yes', 'on', '1', 'YES', 'ON']; // case insensitive

		for (const value of testCases) {
			const formData = new FormData();
			formData.set('status', value);

			const result = await superValidate(formData, zod(schema));
			expect(result.valid).toBe(true);
			expect(result.data.status).toBe(true);
		}
	});

	it('should validate custom falsy values', async () => {
		const testCases = ['no', 'off', '0', 'NO', 'OFF']; // case insensitive

		for (const value of testCases) {
			const formData = new FormData();
			formData.set('status', value);

			const result = await superValidate(formData, zod(schema));
			expect(result.valid).toBe(true);
			expect(result.data.status).toBe(false);
		}
	});

	it('should fail for values not in truthy/falsy lists', async () => {
		const formData = new FormData();
		formData.set('status', 'maybe');

		const result = await superValidate(formData, zod(schema));
		expect(result.valid).toBe(false);
		expect(result.errors.status).toBeDefined();
	});
});

describe('z.stringbool() in nested objects', () => {
	const schema = z.object({
		user: z.object({
			active: z.stringbool({
				truthy: ['true'],
				falsy: ['false']
			})
		})
	});

	it('should handle stringbool in nested objects with dataType: json', async () => {
		const data = {
			user: {
				active: 'true'
			}
		};

		const result = await superValidate(data, zod(schema));
		expect(result.valid).toBe(true);
		expect(result.data.user.active).toBe(true);
	});
});
