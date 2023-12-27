import { zod } from '$lib/adapters/zod.js';
import { clientValidation } from '$lib/client/clientValidation.js';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

enum Foo {
	A = 2,
	B = 3
}

const schema = z.object({
	name: z.string().min(5),
	foo: z.nativeEnum(Foo),
	arr: z.string().min(10).array().min(3).max(10)
});

describe('Client-side validation', () => {
	const data = {
		name: 'Test',
		foo: Foo.B,
		arr: ['A']
	};

	it('Should work as superValidate', async () => {
		const form = await clientValidation(zod(schema), data, 'id', {}, false);

		expect(form).toEqual({
			valid: false,
			posted: false,
			errors: {
				name: ['String must contain at least 5 character(s)'],
				arr: {
					'0': ['String must contain at least 10 character(s)'],
					_errors: ['Array must contain at least 3 element(s)']
				}
			},
			data: { name: 'Test', foo: 3, arr: ['A'] },
			constraints: {},
			message: undefined,
			id: 'id'
		});
	});
});
