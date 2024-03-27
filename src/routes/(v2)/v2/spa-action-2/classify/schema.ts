import * as v from 'valibot';

export const classifySchema = v.object({
	id: v.number([v.minValue(1)]),
	name: v.string()
});
