import { z } from 'zod';

export const schema = z.object({
	number: z.bigint().min(BigInt(1000000), 'A BIG number please!')
});
