import { describe, expect, test } from 'vitest';
import { unflattenFormData } from '$lib/unflattenFormData.js';

describe('unflattenFormData', () => {
	test('should assemble a simple data structure', () => {
		const data = new FormData();
		data.append('a.b.c', '1');

		const result = unflattenFormData(data);
		expect(result).toEqual({ a: { b: { c: '1' } } });
	});

	test('should aggregate multiple keys of the same name', () => {
		const data = new FormData();
		data.append('a.b', '1');
		data.append('a.b', '2');
		const result = unflattenFormData(data);
		expect(result).toEqual({ a: { b: ['1', '2'] } });
	});

	test('should parse array notation', () => {
		const data = new FormData();
		data.append('a.b[0]', '0');
		data.append('a.b[1]', '1');
		const result = unflattenFormData(data);
		expect(result).toEqual({ a: { b: ['0', '1'] } });
	});

	test('should parse array and object mixing', () => {
		const data = new FormData();
		data.append('a.b[0].c.d[1][0]', '1');
		const result = unflattenFormData(data);
		expect(result).toEqual({ a: { b: [{ c: { d: [undefined, ['1']] } }] } });
	});

	test('should parse a large unwieldy nested form', () => {
		const data = new FormData();
		data.append('a.b[0].c.d[1][0]', '1');
		data.append('a.b[0].c.d[1][0]', '2');
		data.append('a.e', '3');
		data.append('a.b[1][0]', '4');
		data.append('a.b[0].f', '5');
		const result = unflattenFormData(data);
		expect(result).toEqual({
			a: {
				b: [
					{
						c: {
							d: [undefined, [['1', '2']]]
						},
						f: '5'
					},
					['4']
				],
				e: '3'
			}
		});
	});
});
