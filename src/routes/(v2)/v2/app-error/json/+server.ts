import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	return json({ code: 'rate_limited', status: 429 }, { status: 430 });
};
