import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  return new Response('Body limit response', { status: 413 });
};
