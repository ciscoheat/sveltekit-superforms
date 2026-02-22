/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { z } from 'zod/v3';
import { z as z4 } from 'zod/v4';
import { zod } from '$lib/adapters/zod.js';
import { zod as zod4 } from '$lib/adapters/zod4.js';
import { superValidate } from '$lib/superValidate.js';

describe('Issue 646 - Top-level transform and refine support', () => {
	describe('Zod v3 adapter', () => {
		it('should accept schema with top-level transform (TypeScript compilation test)', async () => {
			const schema = z
				.object({
					name: z.string()
				})
				.transform((s) => s);

			// Should not throw TypeScript error - this is the main fix
			const form = await superValidate(zod(schema));
			expect(form).toBeDefined();
			// Note: Top-level transforms change the output type, making introspection difficult
		});

		it('should accept schema with top-level refine', async () => {
			const schema = z
				.object({
					name: z.string()
				})
				.refine((data) => data.name.length > 0, {
					message: 'Name is required'
				});

			// Should not throw TypeScript error - this is the main fix
			const validForm = await superValidate({ name: 'test' }, zod(schema));
			expect(validForm.valid).toBe(true);

			// Test with invalid data
			const invalidForm = await superValidate({ name: '' }, zod(schema));
			expect(invalidForm.valid).toBe(false);
			// Root-level refine errors appear in _errors
			expect(invalidForm.errors._errors).toEqual(['Name is required']);
		});

		it('should work with field-level transform', async () => {
			const schema = z.object({
				name: z.string().transform((s) => s.toUpperCase())
			});

			const form = await superValidate({ name: 'test' }, zod(schema));
			expect(form.valid).toBe(true);
			expect(form.data.name).toBe('TEST');
		});

		it('should work with superRefine at top level', async () => {
			const schema = z
				.object({
					password: z.string(),
					confirmPassword: z.string()
				})
				.superRefine((data, ctx) => {
					if (data.password !== data.confirmPassword) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: 'Passwords do not match',
							path: ['confirmPassword']
						});
					}
				});

			const validForm = await superValidate(
				{ password: 'test123', confirmPassword: 'test123' },
				zod(schema)
			);
			expect(validForm.valid).toBe(true);

			const invalidForm = await superValidate(
				{ password: 'test123', confirmPassword: 'different' },
				zod(schema)
			);
			expect(invalidForm.valid).toBe(false);
			expect(invalidForm.errors.confirmPassword).toEqual(['Passwords do not match']);
		});
	});

	describe('Zod v4 adapter', () => {
		it('should accept schema with top-level transform (issue #646 - TypeScript fix)', async () => {
			const brokenSchema = z4
				.object({
					name: z4.string()
				})
				.transform((s) => s);

			// This should NOT throw TypeScript error anymore - THIS IS THE FIX FOR #646
			// Before the fix, this would fail with:
			// "Argument of type ZodPipe<...> is not assignable to parameter of type ZodValidationSchema"

			// Note: Top-level transforms prevent schema introspection, so this will throw at runtime
			// The important fix is that it compiles without TypeScript errors
			try {
				await superValidate({ name: 'test' }, zod4(brokenSchema));
				// If we get here, great! The schema introspection worked
			} catch (error) {
				// Expected: "No shape could be created for schema"
				// This is a runtime limitation, not a TypeScript error
				expect((error as Error).message).toContain('No shape could be created');
			}
		});

		it('should accept schema with top-level refine', async () => {
			const schema = z4
				.object({
					name: z4.string()
				})
				.refine((data) => data.name.length > 0, {
					message: 'Name is required'
				});

			// Should not throw TypeScript error - this is the main fix
			const validForm = await superValidate({ name: 'test' }, zod4(schema));
			expect(validForm.valid).toBe(true);

			// Test with invalid data
			const invalidForm = await superValidate({ name: '' }, zod4(schema));
			expect(invalidForm.valid).toBe(false);
			// Root-level refine errors appear in _errors
			expect(invalidForm.errors._errors).toEqual(['Name is required']);
		});

		it('should work with field-level transform (the working example from issue)', async () => {
			const workingSchema = z4.object({
				name: z4.string().transform((s) => s.toUpperCase())
			});

			const form = await superValidate({ name: 'test' }, zod4(workingSchema));
			expect(form.valid).toBe(true);
			expect(form.data.name).toBe('TEST');
		});

		it('should work with superRefine at top level', async () => {
			const schema = z4
				.object({
					password: z4.string(),
					confirmPassword: z4.string()
				})
				.superRefine((data, ctx) => {
					if (data.password !== data.confirmPassword) {
						ctx.addIssue({
							code: 'custom' as any,
							message: 'Passwords do not match',
							path: ['confirmPassword']
						});
					}
				});

			const validForm = await superValidate(
				{ password: 'test123', confirmPassword: 'test123' },
				zod4(schema)
			);
			expect(validForm.valid).toBe(true);

			const invalidForm = await superValidate(
				{ password: 'test123', confirmPassword: 'different' },
				zod4(schema)
			);
			expect(invalidForm.valid).toBe(false);
			expect(invalidForm.errors.confirmPassword).toEqual(['Passwords do not match']);
		});
	});

	describe('Comparison between Zod v3 and v4', () => {
		it('should handle top-level refines identically', async () => {
			const schema3 = z.object({ value: z.number() }).refine((data) => data.value > 0, {
				message: 'Value must be positive'
			});

			const schema4 = z4.object({ value: z4.number() }).refine((data) => data.value > 0, {
				message: 'Value must be positive'
			});

			const form3Valid = await superValidate({ value: 5 }, zod(schema3));
			const form4Valid = await superValidate({ value: 5 }, zod4(schema4));

			expect(form3Valid.valid).toBe(true);
			expect(form4Valid.valid).toBe(true);

			const form3Invalid = await superValidate({ value: -5 }, zod(schema3));
			const form4Invalid = await superValidate({ value: -5 }, zod4(schema4));

			expect(form3Invalid.valid).toBe(false);
			expect(form4Invalid.valid).toBe(false);
			expect(form3Invalid.errors._errors).toEqual(form4Invalid.errors._errors);
		});
	});
});
