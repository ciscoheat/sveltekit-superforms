import { object, string, optional, pipe, transform, boolean } from 'valibot';

export const schema = pipe(
	object({
		is_appointment: boolean(),
		is_emergency: boolean(),
		priority: string(),
		name: optional(string(), 'Hello world!')
	}),
	transform((input) => {
		if (!input.is_appointment) input.is_emergency = false;
		if (input.is_emergency) input.priority = 'Urgent';
		else input.priority = 'Normal';
		console.log(input);
		return input;
	})
);
