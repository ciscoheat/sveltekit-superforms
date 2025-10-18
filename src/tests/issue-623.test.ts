import { describe, it, expect } from 'vitest';
import { z as z4 } from 'zod';
import { zod } from '$lib/adapters/zod4.js';
import { superValidate } from '$lib/superValidate.js';

describe('Issue 623 - Array and date properties modify each other', () => {
	it('should preserve date values when array validation fails (Zod v4)', async () => {
		const data = {
			date: new Date('2023-10-01T00:00:00Z'),
			items: [
				{ id: 1, product: 'Product A' },
				{ id: 2, product: 'Product B' },
				{ id: 'bad' as any, product: 'Product C' } // This will fail validation
			]
		};

		const schema = z4.object({
			date: z4.date(),
			items: z4.array(
				z4.object({
					id: z4.number(),
					product: z4.string()
				})
			)
		});

		const form = await superValidate(data, zod(schema), {
			errors: false
		});

		// Form should be invalid due to bad array item
		expect(form.valid).toBe(false);

		// Date should still be preserved, not become empty string
		expect(form.data.date).toBeInstanceOf(Date);
		expect(form.data.date).toEqual(new Date('2023-10-01T00:00:00Z'));
		expect(form.data.date).not.toBe('');
	});

	it('should preserve date values when array validation fails (nested dates)', async () => {
		const data = {
			dates: {
				startDate: new Date('2023-10-01T00:00:00Z'),
				endDate: new Date('2023-12-31T00:00:00Z')
			},
			items: [
				{ id: 1, name: 'Item 1' },
				{ id: 'invalid' as any, name: 'Item 2' } // This will fail validation
			]
		};

		const schema = z4.object({
			dates: z4.object({
				startDate: z4.date(),
				endDate: z4.date()
			}),
			items: z4.array(
				z4.object({
					id: z4.number(),
					name: z4.string()
				})
			)
		});

		const form = await superValidate(data, zod(schema), {
			errors: false
		});

		// Form should be invalid due to bad array item
		expect(form.valid).toBe(false);

		// Dates should still be preserved
		expect(form.data.dates.startDate).toBeInstanceOf(Date);
		expect(form.data.dates.endDate).toBeInstanceOf(Date);
		expect(form.data.dates.startDate).toEqual(new Date('2023-10-01T00:00:00Z'));
		expect(form.data.dates.endDate).toEqual(new Date('2023-12-31T00:00:00Z'));
	});

	it('should handle valid data with both dates and arrays correctly', async () => {
		const data = {
			date: new Date('2023-10-01T00:00:00Z'),
			items: [
				{ id: 1, product: 'Product A' },
				{ id: 2, product: 'Product B' }
			]
		};

		const schema = z4.object({
			date: z4.date(),
			items: z4.array(
				z4.object({
					id: z4.number(),
					product: z4.string()
				})
			)
		});

		const form = await superValidate(data, zod(schema), {
			errors: false
		});

		// Form should be valid
		expect(form.valid).toBe(true);

		// Date should be preserved
		expect(form.data.date).toBeInstanceOf(Date);
		expect(form.data.date).toEqual(new Date('2023-10-01T00:00:00Z'));

		// Array should be preserved
		expect(form.data.items).toEqual([
			{ id: 1, product: 'Product A' },
			{ id: 2, product: 'Product B' }
		]);
	});

	it('should preserve multiple dates when array validation fails', async () => {
		const data = {
			createdAt: new Date('2023-01-01T00:00:00Z'),
			updatedAt: new Date('2023-10-01T00:00:00Z'),
			items: [{ id: 'bad' as any }]
		};

		const schema = z4.object({
			createdAt: z4.date(),
			updatedAt: z4.date(),
			items: z4.array(
				z4.object({
					id: z4.number()
				})
			)
		});

		const form = await superValidate(data, zod(schema), {
			errors: false
		});

		expect(form.valid).toBe(false);
		expect(form.data.createdAt).toBeInstanceOf(Date);
		expect(form.data.updatedAt).toBeInstanceOf(Date);
		expect(form.data.createdAt).toEqual(new Date('2023-01-01T00:00:00Z'));
		expect(form.data.updatedAt).toEqual(new Date('2023-10-01T00:00:00Z'));
	});

	it('should preserve date values when array validation fails (without errors option)', async () => {
		const data = {
			date: new Date('2023-10-01T00:00:00Z'),
			items: [
				{ id: 1, product: 'Product A' },
				{ id: 2, product: 'Product B' },
				{ id: 'bad' as any, product: 'Product C' } // This will fail validation
			]
		};

		const schema = z4.object({
			date: z4.date(),
			items: z4.array(
				z4.object({
					id: z4.number(),
					product: z4.string()
				})
			)
		});

		// Note: NO errors: false option here!
		const form = await superValidate(data, zod(schema));

		// Form should be invalid due to bad array item
		expect(form.valid).toBe(false);

		// Date should still be preserved, not become empty string
		expect(form.data.date).toBeInstanceOf(Date);
		expect(form.data.date).toEqual(new Date('2023-10-01T00:00:00Z'));
		expect(form.data.date).not.toBe('');
	});

	it('should preserve date in the exact scenario from issue #623', async () => {
		// This is the EXACT test case from the GitHub issue
		const data = {
			date: new Date('2023-10-01T00:00:00Z'),
			items: [
				{ id: 1, product: 'Product A' },
				{ id: 2, product: 'Product B' },
				{ id: 'bad' as any, product: '' }
			]
		};

		const schema = z4.object({
			date: z4.date(),
			items: z4.array(
				z4.object({
					id: z4.number(),
					product: z4.string()
				})
			)
		});

		const form = await superValidate(data, zod(schema), {
			errors: false
		});

		// Form should be invalid due to bad array item
		expect(form.valid).toBe(false);
		// The issue reports that date becomes empty string ""
		expect(form.data.date).not.toBe('');
		expect(form.data.date).toBeInstanceOf(Date);
		expect(form.data.date).toEqual(new Date('2023-10-01T00:00:00Z'));
	});
});
