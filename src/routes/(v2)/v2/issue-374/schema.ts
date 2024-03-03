import { z } from 'zod';

const otherSchema1 = z.string();
const otherSchema2 = z.object({
	value: z.string()
});

export const schema = z.object({
	obj1: otherSchema1,
	obj2: otherSchema1,

	obj3: otherSchema2,
	obj4: otherSchema2
});
