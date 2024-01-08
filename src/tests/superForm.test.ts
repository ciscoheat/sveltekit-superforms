import { zod } from '$lib/adapters/zod.js';
import type { SuperForm } from '$lib/client/index.js';
import { superForm, superValidate, type SuperValidated } from '$lib/index.js';
import { get } from 'svelte/store';
import merge from 'ts-deepmerge';
import { describe, it, expect, beforeEach, test } from 'vitest';
import { z } from 'zod';

const schema = z.object({
	name: z.string().default('Unknown'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(3),
	score: z.number().int().min(0)
});

type Schema = z.infer<typeof schema>;

function updateForm(data: Partial<Schema>, taint?: boolean | 'untaint') {
	form.form.update(
		($form) => {
			const output = merge($form, data) as Schema;
			//console.log('🚀 ~ file: superForm.test.ts:25 ~ updateForm ~ output:', output);
			return output;
		},
		{ taint }
	);
}

let validated: SuperValidated<Schema>;
let form: SuperForm<Schema>;

beforeEach(async () => {
	validated = await superValidate(zod(schema));
	form = superForm(validated, { validators: zod(schema) });
});

describe('Tainted', () => {
	let tainted: SuperForm<Schema>['tainted'];

	function checkTaint(
		data: Partial<Schema>,
		expected: Record<string, unknown>,
		taint?: boolean | 'untaint'
	) {
		updateForm(data, taint);
		expect(get(tainted)).toStrictEqual(expected);
	}

	beforeEach(async () => {
		tainted = form.tainted;
	});

	it('Should update tainted properly', () => {
		expect(get(tainted)).toBeUndefined();
		expect(form.isTainted()).toBe(false);

		checkTaint({ name: 'Test' }, { name: true });

		expect(get(form.form).name).toEqual('Test');
		expect(form.isTainted()).toBe(true);
		expect(form.isTainted('name')).toBe(true);
		expect(form.isTainted('tags')).toBe(false);

		checkTaint(
			{ tags: ['A'] },
			{
				name: true,
				tags: {
					'0': true
				}
			}
		);

		expect(form.isTainted('tags')).toBe(true);
		expect(form.isTainted('tags[0]')).toBe(true);
	});

	describe('When not tainting', () => {
		it("Should not set field to undefined if field isn't tainted", () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ tags: ['A'] },
				{
					name: true,
					tags: {
						'0': undefined
					}
				},
				false
			);
		});
	});

	describe('Untainting', () => {
		it('Should set untainted field to undefined if field is tainted already', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ name: 'Test 2' },
				{
					name: true
				},
				false
			);
			checkTaint(
				{ name: 'Test 3' },
				{
					name: undefined
				},
				'untaint'
			);
		});

		it('should set the tainted field to undefined if it gets the same value as its original state', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			expect(form.isTainted('name')).toBe(true);
			checkTaint({ name: 'Unknown' }, { name: undefined });
			expect(form.isTainted('name')).toBe(false);
		});
	});
});

describe('Validate', () => {
	test('default options should update errors but not taint the form', async () => {
		form.form.update(
			($form) => {
				$form.score = -1;
				return $form;
			},
			{ taint: false }
		);
		expect(form.isTainted()).toBe(false);

		expect(await form.validate('score')).toEqual(['Number must be greater than or equal to 0']);

		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(-1);
		expect(form.isTainted()).toBe(false);
	});

	test('testing a value should update errors but not taint the form', async () => {
		expect(form.isTainted()).toBe(false);

		expect(await form.validate('score', { value: -10 })).toEqual([
			'Number must be greater than or equal to 0'
		]);

		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(-10);
		expect(form.isTainted()).toBe(false);
	});

	test('using a custom error should update form errors', async () => {
		expect(await form.validate('score', { errors: 'Score cannot be negative.' })).toBeUndefined();

		form.form.update(
			($form) => {
				$form.score = -1;
				return $form;
			},
			{ taint: false }
		);

		const scoreError = 'Score cannot be negative.';

		expect(await form.validate('score', { errors: scoreError })).toEqual([scoreError]);
		expect(get(form.errors).score).toEqual([scoreError]);
	});

	test('if setting a value, the field can be tainted', async () => {
		expect(await form.validate('score', { value: 10, taint: true })).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(10);
		expect(form.isTainted('score')).toBe(true);
	});

	test('if setting a value, the field can be tainted', async () => {
		expect(await form.validate('score', { value: 10, taint: true })).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(10);
		expect(form.isTainted('score')).toBe(true);
	});

	test('setting an invalid value, only updating the value, not the errors', async () => {
		expect(await form.validate('score', { value: -10, update: 'value' })).toEqual([
			'Number must be greater than or equal to 0'
		]);
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(-10);
		expect(form.isTainted('score')).toBe(false);
	});

	test('setting an invalid value, only updating the errors, not the value', async () => {
		expect(await form.validate('score', { value: -10, update: 'errors' })).toEqual([
			'Number must be greater than or equal to 0'
		]);
		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(0);
		expect(form.isTainted('score')).toBe(false);
	});

	test('should return the errors for a form field', async () => {
		form.form.update(($form) => {
			$form.score = -1;
			return $form;
		});

		expect(await form.validate('name')).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(await form.validate('score')).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);

		expect(
			await form.validate('score', {
				value:
					"unfortunately passing a string won't cause a type error due to no partial type inference," +
					"but it will produce an error so that's fine."
			})
		).toEqual(['Expected number, received string']);

		expect(await form.validate('score', { value: 1 })).toBeUndefined();

		expect((await form.validate()).data).toEqual(get(form.form));
	});
});

///// mockSvelte.ts (must be copy/pasted here) ////////////////////////////////

import { vi } from 'vitest';

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/stores', async () => {
	const { readable, writable } = await import('svelte/store');

	const getStores = () => ({
		navigating: readable(null),
		page: readable({ url: new URL('http://localhost'), params: {} }),
		session: writable(null),
		updated: readable(false)
	});

	const page: typeof import('$app/stores').page = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().page.subscribe(fn);
		}
	};

	const navigating: typeof import('$app/stores').navigating = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().navigating.subscribe(fn);
		}
	};

	return {
		getStores,
		navigating,
		page
	};
});
