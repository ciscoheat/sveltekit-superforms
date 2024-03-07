import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/index.js';
import { describe, it, expect, assert } from 'vitest';
import { z } from 'zod';

const schema = z.object({
	test: z.string().nullish().default('OK'),
	len: z
		.string()
		.transform((s) => s.length)
		.pipe(z.number().min(2)),
	num: z.number().nonnegative()
});

//type Out = Infer<typeof schema>;
//type In = InferIn<typeof schema>;

it('should be undefined when default values are used', async () => {
	const form = await superValidate(zod(schema));
	expect(form.data).toEqual({ test: 'OK', len: 0, num: 0 });
	expect(form.input).toBeUndefined();
});

it('should be using the default values from the input option when it is set', async () => {
	const form = await superValidate(zod(schema), { inputDefaults: { len: '' } });
	expect(form.data).toEqual({ test: 'OK', len: 0, num: 0 });
	expect(form.input).toEqual({ test: 'OK', len: '', num: 0 });
});

it('should be using the default values from the input option even for optional fields', async () => {
	const form = await superValidate(zod(schema), { inputDefaults: { len: '', test: 'test' } });
	expect(form.data).toEqual({ test: 'test', len: 0, num: 0 });
	expect(form.input).toEqual({ test: 'test', len: '', num: 0 });
});

describe('should return the parsed data if inputDefaults is set', () => {
	it('for empty FormData', async () => {
		const formData = new FormData();
		const form = await superValidate(formData, zod(schema), { inputDefaults: { len: '' } });

		assert(!form.valid);
		expect(form.data).toEqual({ test: 'OK', len: 0, num: 0 });
		expect(form.input).toEqual({ len: '', test: 'OK', num: 0 });
	});

	it('for valid FormData', async () => {
		const formData = new FormData();
		formData.set('len', 'testing');
		formData.set('test', 'test');
		const form = await superValidate(formData, zod(schema), { inputDefaults: { len: '' } });

		assert(form.valid);
		expect(form.data).toEqual({ test: 'test', len: 7, num: 0 });
		expect(form.input).toEqual({ test: 'test', len: 'testing', num: 0 });
	});

	it('for valid FormData that should be parsed', async () => {
		const formData = new FormData();
		formData.set('len', 'testing');
		formData.set('test', 'test');
		formData.set('num', '123');
		const form = await superValidate(formData, zod(schema), { inputDefaults: { len: '' } });

		assert(form.valid);
		expect(form.data).toEqual({ test: 'test', len: 7, num: 123 });
		expect(form.input).toEqual({ test: 'test', len: 'testing', num: 123 });
	});

	it('for invalid FormData with same type', async () => {
		const formData = new FormData();
		formData.set('len', 't');
		const form = await superValidate(formData, zod(schema), { inputDefaults: { len: '' } });

		assert(!form.valid);
		expect(form.input).toEqual({ test: 'OK', len: 't', num: 0 });
		expect(form.data).toEqual({ test: 'OK', len: 0, num: 0 });
	});

	it('for invalid data with different type', async () => {
		// @ts-expect-error Deliberately invalid types
		const form = await superValidate({ test: 123, len: 456 }, zod(schema), {
			inputDefaults: { len: '' }
		});

		assert(!form.valid);
		expect(form.input).toEqual({ test: 123, len: 456, num: 0 });
		expect(form.data).toEqual({ test: 'OK', len: 456, num: 0 });
	});
});

/*
type T = {
	name: string | undefined;
	email: string;
	tags: string[];
	score: number;
	nestad:
		| {
				date: Date;
				date2: Date | undefined;
		  }
		| undefined;
	date: Date | undefined;
	dateArr?: Date[] | undefined;
	nospace: string | undefined;
};

type In = {
	len: string;
	test?: string | null | undefined;
	nested: {
		date: string;
	};
};

type Out = {
	len: number;
	test: string | null;
	nested: {
		date: Date;
	};
};
*/
