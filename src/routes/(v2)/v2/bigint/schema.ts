import { z } from 'zod/v3';

export const schema = z.object({
	number: z.bigint().min(BigInt(1000000), 'A BIG number please!')
});
