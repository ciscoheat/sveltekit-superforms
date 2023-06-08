import { superValidate } from "$lib/server";
import { z } from "zod";

const schema = z.object({
	name: z.string().min(1, "Cannot be empty"),
});

export const load = async ({request, params}) => {
	const initialData = {
		name: "Testing"
	}
	const form = await superValidate(initialData, schema)
	console.log("🚀 ~ file: +page.server.ts:13 /issue-164-3", form)

	return {form}
}
