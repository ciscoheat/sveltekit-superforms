

import { z } from 'zod';
import { expect, test } from 'vitest';
import { superValidate } from '$lib/superValidate';


test('Should work without custom transform', async () => {
    const result = await superValidate({name: 'test-123'}, z.object({
        name: z.string().min(2)
    }));
    expect(result.valid).toEqual(true);
    expect(result.data).toEqual({name: 'test-123'});
});

test('Should work with custom transform', async () => {
    const result = await superValidate({name: 'test-123', stringToNumber: 'test-123'}, z.object({
        name: z.string().min(2),
        stringToNumber: z.string().transform((val) => val.length)
    }));
    expect(result.valid).toEqual(true);
    expect(result.data).toEqual({
        name: 'test-123',
        stringToNumber: 8
    })
});