import { z } from 'zod/v3';

export const schema = z.object({
	business_id: z.string(),
	shareholders: z
		.object({
			first_name: z.string().optional(),
			middle_name: z.string().optional(),
			id_issuance_date: z.coerce.date().max(new Date()).optional()
		})
		.array()
		.min(1)
});
