import { zod as zod4 } from '$lib/adapters/zod4.js';
import { superValidate } from '$lib/index.js';
import { z } from 'zod/v4';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const formId = "test-good"

const ZodSchema = z.object({ hello: z.string() })
const FormSchema = zod4(ZodSchema)

export async function load() {
    const form = await superValidate(FormSchema, { id: formId })
    return { form }
}

export const actions = {
    async default() {
        await delay(5000)
        const form = await superValidate(FormSchema, { id: formId })
        return { form }
    }
}
