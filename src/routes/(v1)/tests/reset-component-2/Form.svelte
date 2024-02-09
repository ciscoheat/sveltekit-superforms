<script lang="ts">
	import type { ValidationAdapter, Infer } from '$lib/adapters/adapters.js';
	import type { registerSchema } from './schema.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { superForm, type SuperValidated } from '$lib/client/index.js';

	export let action: string;
	export let schema: ValidationAdapter<Infer<typeof registerSchema>>;
	export let data: SuperValidated<Infer<typeof registerSchema>>;
	export let invalidateAll: boolean; // set to false to keep form data using muliple forms on a page

	export let dataType: 'form' | 'json' = 'form';

	export const _form = superForm(data, {
		dataType: dataType,
		validators: schema ? schema : undefined,
		invalidateAll,
		onError({ result }) {
			$message = {
				text: result?.error?.message,
				status: 500
			};
		},
		onUpdated({ form }) {
			if (form.valid) {
				// Successful post! Do some more client-side stuff.
			}
		}
	});

	const { form, message, delayed, errors, allErrors, enhance } = _form;
</script>

<form method="POST" use:enhance {...$$restProps}>
	<slot
		form={_form}
		message={$message}
		errors={$errors}
		allErrors={$allErrors}
		delayed={$delayed}
	/>
</form>

<SuperDebug data={$form} />
