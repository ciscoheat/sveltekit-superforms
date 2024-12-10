import { z } from 'zod';

const morningSchema = z.literal('morning').transform(() => ({ from: '06:00', to: '11:00' }));

const noonSchema = z.literal('noon').transform(() => ({ from: '11:00', to: '14:00' }));

const eveningSchema = z.literal('evening').transform(() => ({ from: '14:00', to: '19:00' }));

export const schema = z.object({
	time: z.union([morningSchema, noonSchema, eveningSchema])
});
