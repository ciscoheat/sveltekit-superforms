import { array, integer, minLength, minValue, number, object, pipe, string } from 'valibot';

/*
export const schema2 = z
  .object({
    name: z.string().min(1, 'Name is too short'),
    tags: z
      .object({
        id: z.number().int().min(3),
        name: z.string().min(2)
      })
      .array()
  })
  .refine((data) => data);
*/

export const schema = object({
	name: pipe(string(), minLength(1, 'Name is too short')),
	tags: array(
		object({
			id: pipe(number(), integer(), minValue(3)),
			name: pipe(string(), minLength(2))
		})
	)
});
