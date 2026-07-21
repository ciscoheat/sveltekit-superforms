import { vi } from 'vitest';

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/state', async () => {
	const page: Partial<typeof import('$app/state').page> = {
		url: new URL('http://localhost'),
		params: {},
		status: 200,
		error: null,
		data: {},
		form: null,
		state: {},
		route: { id: null }
	};

	const navigating: typeof import('$app/state').navigating = {
		from: null,
		to: null,
		type: null,
		willUnload: null,
		delta: null,
		complete: null
	};

	return {
		page,
		navigating,
		updated: { current: false, check: async () => false }
	};
});
