<script lang="ts" module>
	type T = Record<string, unknown>;
	type M = unknown;
</script>

<script lang="ts" generics="T extends Record<string, unknown>, M">
	import SuperDebug, { type SuperValidated } from '$lib/index.js';
	import { superForm } from '$lib/index.js';

	export let data: SuperValidated<T, M>;
	export let dataType: 'form' | 'json' = 'form';
	export let invalidateAll = true; // set to false to keep form data using muliple forms on a page

	export const theForm = superForm(data, {
		dataType,
		invalidateAll,
		onUpdated({ form }) {
			if (form.valid) {
				// Successful post! Do some more client-side stuff.
			}
		}
	});

	const { form, message, delayed, errors, allErrors, enhance } = theForm;
</script>

<form method="POST" use:enhance {...$$restProps}>
	<slot
		form={theForm}
		message={$message}
		errors={$errors}
		allErrors={$allErrors}
		delayed={$delayed}
	/>
</form>

<SuperDebug data={$form}></SuperDebug>
