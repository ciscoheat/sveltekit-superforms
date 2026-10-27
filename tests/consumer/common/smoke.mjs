// @ts-check

import { strict as assert } from 'node:assert';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
try {
	const address = server.httpServer.address();
	assert(address && typeof address === 'object', 'Preview server must be listening.');
	const origin = `http://127.0.0.1:${address.port}`;
	const page = await fetch(origin, { signal: AbortSignal.timeout(15000) });
	assert.equal(page.status, 200);
	assert.match(await page.text(), /<form/);
	const actions = /** @type {[string, number, string][]} */ ([
		['', 400, 'failure'],
		['Superforms', 200, 'success']
	]);
	for (const [name, status, type] of actions) {
		const response = await fetch(origin, {
			method: 'POST',
			headers: { origin, accept: 'application/json', 'x-sveltekit-action': 'true' },
			body: new URLSearchParams({ name }),
			signal: AbortSignal.timeout(15000)
		});
		// Kit 2 wraps enhanced action failures in HTTP 200; inspect the action result too.
		assert([200, status].includes(response.status), `Unexpected HTTP status ${response.status}`);
		const result = await response.json();
		assert.equal(result.status, status);
		assert.equal(result.type, type);
	}
} finally {
	/** @type {import('node:http').Server} */ (server.httpServer).closeAllConnections();
	await new Promise((resolve, reject) => {
		server.httpServer.close((error) => (error ? reject(error) : resolve(undefined)));
	});
}
