import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	return text('Nope', { status: 417 });
};
