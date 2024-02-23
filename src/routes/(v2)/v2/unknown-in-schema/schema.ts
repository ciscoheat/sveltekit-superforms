import { z } from 'zod';

export const schema = z.object({
	name: z.string(),
	age: z.number(),
	homePlanet: z.unknown()
});

export const anySchema = z.object({
	name: z.string(),
	age: z.any()
});

export const userSchema = z.object({
	name: z.string(),
	options: z
		.array(
			z.object({
				color: z.string().trim().nullable(),
				value: z.string().trim()
			})
		)
		.default([])
});

/**
* 
* Expected type
* ----------------
 name: string;
 options: {
			value: string;
			color: string | null;
	}[];
* 
*/
export type UserSchemaInffered = z.infer<typeof userSchema>;
