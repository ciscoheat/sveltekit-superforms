import { zod } from '$lib/adapters/zod.js';
import { z } from 'zod';

export const generateSchema = (category: string) =>
	zod(z.object(Object.fromEntries([...category].map((q) => [q, z.string().min(1)]))));
