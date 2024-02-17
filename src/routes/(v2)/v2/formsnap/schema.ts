import { z } from 'zod';

/*
type T = {
	flavors: ('vanilla' | 'chocolate' | 'cookies and cream' | 'strawberry')[];
	toppings: ('sprinkles' | 'hot fudge' | 'whipped cream' | 'cherry')[];
};
*/

export const schema = z.object({
	flavors: z.enum(['vanilla', 'chocolate', 'cookies and cream', 'strawberry']).array(),
	toppings: z.enum(['sprinkles', 'hot fudge', 'whipped cream', 'cherry']).array()
});
