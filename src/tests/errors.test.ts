import { zod } from '$lib/adapters/zod.js';
import { flattenErrors, mergeDefaults } from '$lib/errors.js';
import { defaultTypes } from '$lib/jsonSchema/schemaDefaults.js';
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

describe.only('Mapping defaults to invalid data', () => {
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
		const data = { len: 'a', name: 'Test' };
		const errors = [{ message: 'Too short', path: ['len'] }];
		expect(mergeDefaults(data, adapter, errors)).toStrictEqual({
			len: 0,
			name: 'Test',
			nested: { score: 0, tags: [] }
		});
	});

	it('should add missing fields with defaults', () => {
		const data = { len: 12 };
		expect(mergeDefaults(data, adapter, [])).toStrictEqual({
			len: 12,
			name: '',
			nested: { score: 0, tags: [] }
		});
	});

	it('should replace nested data properly', () => {
		const data = { nested: { tags: ['a', 'longer'] } };
		expect(mergeDefaults(data, adapter, [])).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', 'longer'] }
		});
	});

	it('should replace incorrectly typed data with the default type, even in arrays', () => {
		const data = { nested: { tags: ['a', 123] } };
		const errors = [{ message: 'Expected string', path: ['nested', 'tags', 1] }];
		expect(mergeDefaults(data, adapter, errors)).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', null] }
		});
	});

	it('should not replace correctly typed data', () => {
		//console.dir(schemaInfoForPath(adapter.jsonSchema, ['nested', 'tags']), { depth: 10 }); //debug
		const data = { nested: { tags: ['a', 'b'] } };
		const errors = [
			{ message: 'Too short', path: ['nested', 'tags', 0] },
			{ message: 'Too short', path: ['nested', 'tags', 1] }
		];

		expect(mergeDefaults(data, adapter, errors)).toStrictEqual({
			len: 0,
			name: '',
			nested: { score: 0, tags: ['a', 'b'] }
		});
	});
});
