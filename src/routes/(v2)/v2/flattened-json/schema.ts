import { z } from 'zod';

const chapter = z.object({
	pages: z.number(),
	events: z.array(z.string())
});

const book = z.object({
	title: z.string(),
	publishingDate: z.string().date(),
	chapters: z.array(chapter)
});

export const schema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	books: z.array(book),
	birthday: z.string().date()
});

//Deep partial is deprecated?
const partialChapter = z
	.object({
		pages: z.number(),
		events: z.array(z.string().optional())
	})
	.partial()
	.extend({ addEvent: z.boolean().optional() });

const partialBook = z
	.object({
		title: z.string(),
		publishingDate: z.string().date(),
		chapters: z.array(partialChapter)
	})
	.partial();

export const partialSchema = z
	.object({
		firstName: z.string(),
		lastName: z.string(),
		books: z.array(partialBook),
		birthday: z.string().date(),
		bookIndex: z.number()
	})
	.partial();
