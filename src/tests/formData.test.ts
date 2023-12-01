import { describe, it, expect } from 'vitest';
import { bigJsonSchema } from './data.js';
import { parseFormData } from '$lib/formData.js';

describe.only('FormData parsing', () => {
	it('Should map primitive types to default values', () => {
		const formData = new FormData();
		formData.set('name', 'Test');
		console.dir(parseFormData(formData, bigJsonSchema), { depth: 10 });
	});
});
