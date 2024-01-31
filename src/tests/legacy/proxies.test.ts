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

		expect(get(form).bool).toBe(false);

		proxy.set('true');

		expect(get(form).bool).toBe(true);
	});

	test('intProxy', async () => {
		const schema = z.object({
			int: z.number().int()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = intProxy(form, 'int');

		expect(get(form).int).toBe(0);

		proxy.set('123');

		expect(get(form).int).toBe(123);
	});

	test('empty intProxy', async () => {
		const schema = z.object({
			int: z.number().int().optional()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = intProxy(form, 'int', {
			empty: 'undefined',
			emptyIfZero: true,
			transform: (value) => (value ? value * 2 : value)
		});

		expect(get(form).int).toBe(undefined);

		proxy.set('123');
		expect(get(form).int).toBe(246);

		proxy.set('');
		expect(get(form).int).toBe(undefined);
	});

	test('intProxy with transform', async () => {
		const schema = z.object({
			int: z.number().int()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = intProxy(form, 'int', {
			transform: (value) => value * 2
		});

		expect(get(form).int).toBe(0);

		proxy.set('123');

		expect(get(form).int).toBe(246);
	});

	test('numberProxy', async () => {
		const schema = z.object({
			number: z.number()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = numberProxy(form, 'number');

		expect(get(form).number).toBe(0);

		proxy.set('123.5');
		expect(get(form).number).toBe(123.5);

		proxy.set('');
		expect(get(form).number).toBe(NaN);
	});

	test('numberProxy with empty settings', async () => {
		const schema = z.object({
			number: z.number()
		});

		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = numberProxy(form, 'number', { zeroIfEmpty: true });

		proxy.set('');
		expect(get(form).number).toBe(0);
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

		expect(get(proxy)).toBe(2);
		proxy.set(123);
		expect(get(proxy)).toBe(123);
		expect(get(form).test[2]).toBe(123);
	});

	test('fieldProxy with FormPath and transform', async () => {
		const superForm = await superValidate(zod(schema));
		const form = writable(superForm.data);

		const proxy = fieldProxy(form, 'test[2]', { transform: (value) => value * 2 });

		expect(get(proxy)).toBe(2);
		proxy.set(123);
		expect(get(proxy)).toBe(246);
		expect(get(form).test[2]).toBe(246);
	});
});
