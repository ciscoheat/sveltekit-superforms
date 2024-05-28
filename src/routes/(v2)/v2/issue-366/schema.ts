import {
	string,
	email,
	object,
	boolean,
	minLength,
	trim,
	picklist,
	pipe,
	literal,
	date
} from 'valibot';

const roleOptions = ['USER', 'PREMIUM', 'ADMIN'] as const;

export const userSchema = object({
	firstName: pipe(string(), trim(), minLength(1, 'Please enter your first name.')),
	lastName: pipe(string(), trim(), minLength(1, 'Please enter your last name.')),
	email: pipe(
		string(),
		trim(),
		email('The email address is not valid.'),
		minLength(1, 'An email address is required.')
	),
	role: picklist(roleOptions, 'You must have a role.'),
	verified: boolean(),
	terms: literal(true, 'You must accept the terms and privacy policy.'),
	receiveEmail: boolean(),
	createdAt: date(),
	updatedAt: date()
});

export const emailSchema = object({
	email: pipe(
		string(),
		trim(),
		email('The email address is not valid.'),
		minLength(1, 'An email address is required.')
	)
});

export type UserSchema = typeof userSchema;
export type emailSchema = typeof emailSchema;
