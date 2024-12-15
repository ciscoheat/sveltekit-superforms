import type { Transport } from '@sveltejs/kit';
import { Decimal } from 'decimal.js';

export const transport: Transport = {
	Decimal: {
		encode: (value) => value instanceof Decimal && value.toString(),
		decode: (str) => new Decimal(str)
	}
};
