import { zod } from '$lib/adapters/zod.js';
import { z } from 'zod/v3';

export const generateSchema = (category: string) =>
	zod(z.object(Object.fromEntries([...category].map((q) => [q, z.string().min(1)]))));
