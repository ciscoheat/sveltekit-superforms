import type { Transport } from '@sveltejs/kit';
import { Decimal } from 'decimal.js';
import { RecordId } from './routes/RecordId.js';

export const transport: Transport = {
	Decimal: {
		encode: (value) => value instanceof Decimal && value.toString(),
		decode: (str) => new Decimal(str)
	},
	RecordId: {
		encode: (record) => record instanceof RecordId && [record.id, record.tb],
		decode: ([id, tb]) => new RecordId(id, tb)
	}
};
