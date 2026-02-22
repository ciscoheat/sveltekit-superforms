import { z } from 'zod/v3';

const deficitForm = z.object({
	grade: z.number().min(0).max(100).nullable().default(null),
	comments: z.string().optional()
});

const sideData = z.object({
	left: deficitForm,
	right: deficitForm
});

export const nerveForm = z.object({
	motor: sideData,
	sensory: sideData,
	dysesthesia: sideData
});
