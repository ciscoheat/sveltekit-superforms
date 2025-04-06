import { z } from 'zod';

const dueDateValueSchema = z
	.date()
	.refine(
		(v) => {
			if (v) {
				return v.getTime() > Date.now();
			}
			return true;
		},
		{ message: 'Due date must be in the future' }
	)
	.nullable()
	.optional();

export const itemUpdatePropertiesSchema = z.object({
	dueDate: dueDateValueSchema
});

const itemUpdateSchema = z.object({
	//itemId: z.string().superRefine(zodSuperRefiners.textLaxed()),
	//childId: z.string().nullable().superRefine(zodSuperRefiners.textLaxed()),
	updates: itemUpdatePropertiesSchema
});
const riskImprovementItemUpdateSchema = z.object({
	itemid: z.string()
});

export const schema = z.object({
	updates: z.array(itemUpdateSchema.or(riskImprovementItemUpdateSchema))
});

export type Schema = z.infer<typeof schema>;
