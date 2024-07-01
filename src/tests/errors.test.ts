import { zod } from '$lib/adapters/zod.js';
import { flattenErrors, mergeDefaults, replaceInvalidDefaults } from '$lib/errors.js';
import type { ValidationErrors } from '$lib/superValidate.js';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Flattening errors', () => {
	it('should work with array-level errors', () => {
		const errors: ValidationErrors<{ test: string[]; name: string }> = {
			test: {
				_errors: ['I AM ERROR']
			},
			name: ['ERROR']
		};

		expect(flattenErrors(errors)).toEqual([
			{ path: 'test._errors', messages: ['I AM ERROR'] },
			{ path: 'name', messages: ['ERROR'] }
		]);
	});
});

describe('Mapping defaults to invalid data', () => {
	const schema = z.object({
		name: z.string(),
		len: z
			.string()
			.transform((s) => s.length)
			.pipe(z.number().min(5)),
		nested: z.object({
			tags: z.string().min(2).nullable().array().min(1),
			score: z.number()
		})
	});

	const adapter = zod(schema);

	it('should replace error fields with defaults', () => {
		const data = mergeDefaults({ len: 'a', name: 'Test' }, adapter.defaults);
		const errors = [{ message: 'Too short', path: ['len'] }];
		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, errors, [])
		).toStrictEqual({
			len: 0,
			name: 'Test',
			nested: { score: 0, tags: [] }
		});
	});

	it('should add missing fields with defaults', () => {
		const data = mergeDefaults({ len: 12 }, adapter.defaults);
		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, [], [])
		).toStrictEqual({
			len: 12,
			name: '',
			nested: { score: 0, tags: [] }
		});
	});

	it('should replace nested data properly', () => {
		const data = mergeDefaults({ nested: { tags: ['a', 'longer'] } }, adapter.defaults);

		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, [], [])
		).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', 'longer'] }
		});
	});

	it('should replace incorrectly typed data with the default type, even in arrays', () => {
		const data = mergeDefaults({ nested: { tags: ['a', 123] } }, adapter.defaults);
		const errors = [{ message: 'Expected string', path: ['nested', 'tags', 1] }];
		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, errors, [])
		).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', null] }
		});
	});

	it('should not let null pass for objects unless the field is nullable', () => {
		const data = mergeDefaults({ nested: null }, adapter.defaults);
		const errors = [{ message: 'Expected an object', path: ['nested'] }];
		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, errors, [])
		).toStrictEqual({
			len: 0,
			name: '',
			nested: { tags: [], score: 0 }
		});
	});

	it('should not replace correctly typed data', () => {
		const data = mergeDefaults({ nested: { tags: ['a', 'b'] } }, adapter.defaults);
		const errors = [
			{ message: 'Too short', path: ['nested', 'tags', 0] },
			{ message: 'Too short', path: ['nested', 'tags', 1] }
		];

		expect(
			replaceInvalidDefaults(data, adapter.defaults, adapter.jsonSchema, errors, [])
		).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', 'b'] }
		});
	});
});

describe('The ValidationErrors type', () => {
	it('should work as expected', () => {
		const schema = z.object({
			name: z.string().min(1),
			birthDate: z
				.object({
					year: z.number(),
					month: z.number(),
					day: z.number()
				})
				.refine(() => {
					// Custom validation logic for the date
					return false; // Assuming the validation fails
				}, 'Invalid Date')
		});

		const data: z.infer<typeof schema> = { name: '', birthDate: { year: 0, month: 0, day: 0 } };
		const errors: ValidationErrors<typeof data> = {};

		const birthErrors: string[] | undefined = errors.birthDate?._errors;
		const name: string[] = errors['name'] ?? [];
		const year: string[] | undefined = errors.birthDate?.year;

		expect(name).toEqual([]);
		expect(year).toBeUndefined();
		expect(birthErrors).toBeUndefined();
	});
});
