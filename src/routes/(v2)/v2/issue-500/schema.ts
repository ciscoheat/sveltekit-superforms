import { z } from 'zod';

export const inviteUserToGroupSchema = z.object({
	username: z.string().min(2)
});

export const modifyGroupAccessSchema = z.object({
	users: z
		.object({
			username: z.string().min(2),
			remove: z.boolean()
		})
		.array()
});

export const fixedModifyGroupAccessSchema = z.object({
	users: z
		.object({
			username: z.string().min(2),
			removed: z.boolean()
		})
		.array()
});
