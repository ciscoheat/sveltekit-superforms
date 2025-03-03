import { email, minLength, object, pipe, string } from 'valibot';
import z from "zod";

export const valibotSchema = object({
	name: pipe(string(), minLength(2)),
	email: pipe(string(), email())
});

export const zodSchema = z.object({
	name: z.string().min(2),
	email: z.string().email()
});