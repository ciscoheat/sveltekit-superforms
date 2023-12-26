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
