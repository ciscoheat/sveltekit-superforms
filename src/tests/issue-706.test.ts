import { describe, it, expect } from 'vitest';
import { superValidate } from '#lib/superValidate.js';
import { zod } from '#lib/adapters/zod4.js';
import { z } from 'zod/v4';

// Records the search params that are read, like SvelteKit does for url.searchParams.
// get/getAll/has track a single key, everything else tracks all of them.
class TrackedSearchParams extends URLSearchParams {
	read = new Set<string>();
	readAll = false;

	get(name: string) {
		this.read.add(name);
		return super.get(name);
	}

	getAll(name: string) {
		this.read.add(name);
		return super.getAll(name);
	}

	has(name: string, value?: string) {
		this.read.add(name);
		return super.has(name, value);
	}

	entries() {
		this.readAll = true;
		return super.entries();
	}

	keys() {
		this.readAll = true;
		return super.keys();
	}

	values() {
		this.readAll = true;
		return super.values();
	}

	forEach(...args: Parameters<URLSearchParams['forEach']>) {
		this.readAll = true;
		return super.forEach(...args);
	}

	[Symbol.iterator]() {
		this.readAll = true;
		return super[Symbol.iterator]();
	}
}

function trackedUrl(search: string) {
	const url = new URL('http://localhost/players' + search);
	const params = new TrackedSearchParams(search);
	Object.defineProperty(url, 'searchParams', { value: params });
	return { url, params };
}

describe('Issue #706 - superValidate(url) should only read the search params in the schema', () => {
	const search = '?name=Ada&tags=a&tags=b&page=2&sort=desc';

	it('should not read search params outside the schema', async () => {
		const schema = z.object({
			name: z.string(),
			tags: z.string().array(),
			active: z.boolean().default(true)
		});

		const { url, params } = trackedUrl(search);
		const form = await superValidate(url, zod(schema));

		expect(params.readAll).toBe(false);
		expect(params.read).not.toContain('page');
		expect(params.read).not.toContain('sort');

		const expected = await superValidate(new URLSearchParams(search), zod(schema));
		expect(form.data).toEqual(expected.data);
		expect(form.data).toEqual({ name: 'Ada', tags: ['a', 'b'], active: true });
	});

	it('should read the keys of all union variants', async () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('player'), name: z.string() }),
			z.object({ type: z.literal('team'), tags: z.string().array() })
		]);

		const { url, params } = trackedUrl(search + '&type=team');
		const form = await superValidate(url, zod(schema));

		expect(params.readAll).toBe(false);
		expect(params.read).not.toContain('page');
		expect(params.read).not.toContain('sort');

		const expected = await superValidate(new URLSearchParams(search + '&type=team'), zod(schema));
		expect(form.data).toEqual(expected.data);
		expect(form.data).toEqual({ type: 'team', tags: ['a', 'b'] });
	});

	it('should still read the form id from the search params', async () => {
		const schema = z.object({ name: z.string() });

		const { url, params } = trackedUrl(search + '&__superform_id=players');
		const form = await superValidate(url, zod(schema));

		expect(params.readAll).toBe(false);
		expect(form.id).toBe('players');
		expect(form.data).toEqual({ name: 'Ada' });
	});
});
