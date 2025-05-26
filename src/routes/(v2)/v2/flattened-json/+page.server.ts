import { zod } from '$lib/adapters/zod.js';
import { partialSchema, schema } from './schema.js';
import { message, superValidate } from '$lib/index.js';
import type { Actions } from '@sveltejs/kit';

export const load = async () => {
	const initialData = {
		firstName: 'Stephen',
		lastName: 'King',
		books: [
			{
				chapters: [{}]
			}
		]
	};
	const form = await superValidate(initialData, zod(partialSchema), { unflatten: true });
	return { form };
};

export const actions: Actions = {
	submit: async ({ request }) => {
		const form = await superValidate(request, zod(schema), { unflatten: true });

		if (!form.valid) {
			return message(form, 'Not valid', { status: 400 });
		}

		return message(form, 'OK');
	},
	'partial-update': async ({ request }) => {
		const form = await superValidate(request, zod(partialSchema), {
			unflatten: true
		});

		if (!form.valid) {
			return message(form, 'Not valid', { status: 400 });
		}

		return { form };
	},
	'add-book': async ({ request }) => {
		const form = await superValidate(request, zod(partialSchema), {
			unflatten: true
		});

		if (!form.valid) {
			return message(form, 'Not valid', { status: 400 });
		}

		if (!form.data.books) {
			form.data.books = [];
		}

		form.data.books.push({});

		return { form };
	},
	'add-chapter': async ({ request }) => {
		const form = await superValidate(request, zod(partialSchema), {
			unflatten: true
		});

		if (!form.valid) {
			return message(form, 'Not valid', { status: 400 });
		}

		if (form.data.bookIndex === undefined) {
			return message(form, 'No book index provided', { status: 400 });
		}

		const book = (form.data.books ?? [])[form.data.bookIndex];

		if (!book) {
			return message(form, 'No matching book', { status: 400 });
		}

		if (!book.chapters) {
			book.chapters = [];
		}

		book.chapters.push({});

		return { form };
	},
	'add-event': async ({ request }) => {
		const form = await superValidate(request, zod(partialSchema), {
			unflatten: true
		});

		if (!form.valid) {
			return message(form, 'Not valid', { status: 400 });
		}

		form.data.books?.forEach((book) =>
			book.chapters?.forEach((chapter) => {
				if (chapter && chapter?.addEvent) {
					chapter.events = chapter.events !== undefined ? [...chapter.events, ''] : [''];
				}
			})
		);

		return { form };
	}
};
