<script lang="ts" module>
	type Schema = ZodSchema;
</script>

<script lang="ts" generics="Schema extends ZodSchema">
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { z, ZodSchema } from 'zod';

	type SchemaObject = z.infer<Schema>;
	export let schema: Schema;
	export let initial: Partial<SchemaObject> | undefined = undefined;

	const zodSchema = zod(schema);
	const defaultSchema = defaults(initial, zodSchema);

	export const superform = superForm(defaultSchema, {
		SPA: true,
		validators: zodSchema,
		resetForm: false,
		dataType: 'json',
		onUpdate: async () => {}
	});

	const { form, message, delayed, errors, allErrors, enhance } = superform;
</script>

<form method="POST" use:enhance {...$$restProps}>
	<slot
		form={superform}
		data={$form}
		message={$message}
		errors={$errors}
		allErrors={$allErrors}
		delayed={$delayed}
	/>
</form>
