import { flattenErrors } from '$lib/errors.js';
import type { ValidationErrors } from '$lib/superValidate.js';
import { describe, it, expect } from 'vitest';

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
