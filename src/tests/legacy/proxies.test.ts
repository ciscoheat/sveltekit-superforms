import { describe, expect, test } from 'vitest';
import { get, writable } from 'svelte/store';
import { superValidate } from '$lib/superValidate.js';
import { booleanProxy, dateProxy, fieldProxy, intProxy, numberProxy } from '$lib/client/index.js';
import { z } from 'zod';
import { zod } from '$lib/adapters/zod.js';

describe('Value proxies', () => {
	test('booleanProxy', async () => {
		const schema = z.object({
			bool: z.boolean()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = booleanProxy(form, 'bool');

		expect(get(form).bool).toStrictEqual(false);

		proxy.set('true');

		expect(get(form).bool).toStrictEqual(true);
	});

	describe('intProxy', () => {
		test('default behavior', async () => {
			const schema = z.object({
				int: z.number().int()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = intProxy(form, 'int');

			expect(get(form).int).toStrictEqual(0);

			proxy.set('123');

			expect(get(form).int).toStrictEqual(123);
		});

		test('with empty string as default', async () => {
			const schema = z.object({
				int: z
					.number()
					.int()
					.default('' as unknown as number)
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = intProxy(form, 'int');

			expect(get(proxy)).toStrictEqual('');
			expect(get(form).int).toStrictEqual(0);

			proxy.set('123');

			expect(get(proxy)).toStrictEqual('123');
			expect(get(form).int).toStrictEqual(123);
		});
	});

	describe('numberProxy', () => {
		test('default behavior', async () => {
			const schema = z.object({
				number: z.number()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = numberProxy(form, 'number');

			expect(get(form).number).toStrictEqual(0);

			proxy.set('123.5');
			expect(get(form).number).toStrictEqual(123.5);

			proxy.set('');
			expect(get(form).number).toStrictEqual(NaN);
		});

		test('with empty: zero', async () => {
			const schema = z.object({
				number: z.number()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = numberProxy(form, 'number', { empty: 'zero' });

			expect(get(proxy)).toStrictEqual('0');
			expect(get(form).number).toStrictEqual(0);
			proxy.set('');
			expect(get(form).number).toStrictEqual(0);
		});

		test('with empty: undefined', async () => {
			const schema = z.object({
				number: z.number().optional()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = numberProxy(form, 'number', { empty: 'undefined' });

			expect(get(proxy)).toStrictEqual('');
			expect(get(form).number).toStrictEqual(undefined);
			proxy.set('');
			expect(get(form).number).toBeUndefined();
		});

		test('with empty: null', async () => {
			const schema = z.object({
				number: z.number().nullable()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = numberProxy(form, 'number', { empty: 'null' });

			expect(get(proxy)).toStrictEqual('');
			expect(get(form).number).toStrictEqual(null);
			proxy.set('');
			expect(get(form).number).toStrictEqual(null);
		});

		test('with empty: zero and empty string as default', async () => {
			const schema = z.object({
				int: z.number().int()
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = intProxy(form, 'int', { empty: 'zero', initiallyEmptyIfZero: true });

			expect(get(proxy)).toStrictEqual('');
			expect(get(form).int).toStrictEqual(0);

			proxy.set('123');
			expect(get(proxy)).toStrictEqual('123');
			expect(get(form).int).toStrictEqual(123);

			proxy.set('');
			expect(get(proxy)).toStrictEqual('');
			expect(get(form).int).toStrictEqual(0);

			form.set({ int: 456 });
			expect(get(proxy)).toStrictEqual('456');
			expect(get(form).int).toStrictEqual(456);

			form.set({ int: 0 });
			expect(get(proxy)).toStrictEqual('0');
			expect(get(form).int).toStrictEqual(0);
		});

		test('with empty: zero and initial value set', async () => {
			const schema = z.object({
				int: z.number().int().default(123)
			});

			const superForm = await superValidate(zod(schema));
			const form = writable(superForm.data);

			const proxy = intProxy(form, 'int', { empty: 'zero', initiallyEmptyIfZero: true });

			expect(get(proxy)).toStrictEqual('123');
			expect(get(form).int).toStrictEqual(123);

			proxy.set('');
			expect(get(proxy)).toStrictEqual('');
			expect(get(form).int).toStrictEqual(0);

			form.set({ int: 456 });
			expect(get(proxy)).toStrictEqual('456');
			expect(get(form).int).toStrictEqual(456);

			form.set({ int: 0 });
			expect(get(proxy)).toStrictEqual('0');
			expect(get(form).int).toStrictEqual(0);
		});
	});

	test('dateProxy', async () => {
		const schema = z.object({
			date: z.date()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = dateProxy(form, 'date');

		expect(get(form).date).toBeUndefined();

		const d = new Date();

		proxy.set(d.toISOString());

		expect(get(form).date).toEqual(d);
	});
});

describe('Field proxies', () => {
	const schema = z.object({
		test: z.number().array().default([0, 1, 2, 3])
	});

	test('fieldProxy with FormPath', async () => {
		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = fieldProxy(form, 'test[2]');

		expect(get(proxy)).toStrictEqual(2);
		proxy.set(123);
		expect(get(proxy)).toStrictEqual(123);
		expect(get(form).test[2]).toStrictEqual(123);
	});
});
