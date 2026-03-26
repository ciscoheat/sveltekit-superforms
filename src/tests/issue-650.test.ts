import { describe, it, expect } from 'vitest';
import { superValidate } from '$lib/superValidate.js';
import { zod } from '$lib/adapters/zod4.js';
import { z } from 'zod/v4';

describe('Issue 650 - Zod 4 Default Date values in nested objects', () => {
	it('should handle default dates in nested objects correctly', async () => {
		const schema = z.object({
			name: z.string().min(2),
			email: z.string().email(),
			dateRange: z
				.object({
					start: z.date(),
					end: z.date()
				})
				.default({
					start: new Date('2025-10-29T10:47:03.068Z'),
					end: new Date('2025-10-29T10:47:03.068Z')
				}),
			dateRangeIndividual: z.object({
				start: z.date().default(new Date('2025-10-29T10:52:25.537Z')),
				end: z.date().default(new Date('2025-10-29T10:52:25.537Z'))
			}),
			date: z.date().default(new Date('2025-10-29T10:47:03.068Z'))
		});

		const form = await superValidate(zod(schema));
		const data = form.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

		// All dates should be Date objects, not strings
		expect(data.dateRange.start).toBeInstanceOf(Date);
		expect(data.dateRange.end).toBeInstanceOf(Date);
		expect(data.dateRangeIndividual.start).toBeInstanceOf(Date);
		expect(data.dateRangeIndividual.end).toBeInstanceOf(Date);
		expect(data.date).toBeInstanceOf(Date);

		// Verify the actual date values match what was set
		expect(data.dateRange.start.toISOString()).toBe('2025-10-29T10:47:03.068Z');
		expect(data.dateRange.end.toISOString()).toBe('2025-10-29T10:47:03.068Z');
		expect(data.dateRangeIndividual.start.toISOString()).toBe('2025-10-29T10:52:25.537Z');
		expect(data.dateRangeIndividual.end.toISOString()).toBe('2025-10-29T10:52:25.537Z');
		expect(data.date.toISOString()).toBe('2025-10-29T10:47:03.068Z');
	});

	it('should handle nested objects with default dates at multiple levels', async () => {
		const schema = z.object({
			level1: z
				.object({
					level2: z
						.object({
							date: z.date()
						})
						.default({
							date: new Date('2025-01-01T00:00:00.000Z')
						})
				})
				.default({
					level2: {
						date: new Date('2025-01-01T00:00:00.000Z')
					}
				})
		});

		const form = await superValidate(zod(schema));
		const data = form.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(data.level1.level2.date).toBeInstanceOf(Date);
		expect(data.level1.level2.date.toISOString()).toBe('2025-01-01T00:00:00.000Z');
	});

	it('should handle mixed default values in nested objects', async () => {
		const schema = z.object({
			settings: z
				.object({
					theme: z.string(),
					createdAt: z.date(),
					count: z.number()
				})
				.default({
					theme: 'dark',
					createdAt: new Date('2025-10-29T00:00:00.000Z'),
					count: 42
				})
		});

		const form = await superValidate(zod(schema));
		const data = form.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(data.settings.theme).toBe('dark');
		expect(data.settings.createdAt).toBeInstanceOf(Date);
		expect(data.settings.createdAt.toISOString()).toBe('2025-10-29T00:00:00.000Z');
		expect(data.settings.count).toBe(42);
	});

	it('should preserve individual field defaults when object has no default', async () => {
		const schema = z.object({
			timestamps: z.object({
				created: z.date().default(new Date('2025-01-01T00:00:00.000Z')),
				updated: z.date().default(new Date('2025-01-02T00:00:00.000Z'))
			})
		});

		const form = await superValidate(zod(schema));
		const data = form.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(data.timestamps.created).toBeInstanceOf(Date);
		expect(data.timestamps.updated).toBeInstanceOf(Date);
		expect(data.timestamps.created.toISOString()).toBe('2025-01-01T00:00:00.000Z');
		expect(data.timestamps.updated.toISOString()).toBe('2025-01-02T00:00:00.000Z');
	});
});
