<script lang="ts">
	import { z } from 'zod';
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib//adapters/zod.js';

	const testArraySchema = z.array(z.string()).min(1);

	const schema = z.object({
		values: z.array(
			z.object({
				testArray: testArraySchema
			})
		),
		defaultValue: z.object({
			testArray: testArraySchema
		})
	});

	const defaultSchemaValue = {
		defaultValue: {
			testArray: []
		},
		values: [
			{
				testArray: []
			}
		]
	};
	const entireForm = superForm(defaults(defaultSchemaValue, zod(schema)), {
		SPA: true,
		dataType: 'json',
		validators: zod(schema),
		onUpdate({ form }) {
			console.log(form.valid);
		}
	});

	const { enhance, errors } = entireForm;
</script>

{JSON.stringify($errors)}

<form method="POST" use:enhance novalidate>
	<button type="submit">Submit</button>
</form>
