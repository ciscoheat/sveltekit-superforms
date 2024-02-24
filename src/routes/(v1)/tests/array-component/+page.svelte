<script lang="ts">
	import { arrayProxy, superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import AutoComplete from './AutoComplete.svelte';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	let novalidate = false;

	const pageForm = superForm(data.form, {
		dataType: 'json',
		validators: zod(schema)
	});
	const { form, errors, message, enhance, tainted, isTainted } = pageForm;
	$: taintedForm = isTainted();

	const options = [
		{ value: 'A', label: 'Aldebaran' },
		{ value: 'B', label: 'Betelgeuse' },
		{ value: 'CA', label: 'Capella' },
		{ value: 'DI', label: 'Diadem' }
	];

	const { values } = arrayProxy(pageForm, 'sub.tags');
	console.log($values[0]?.charAt(0));
</script>

{#if taintedForm}<h3>FORM IS TAINTED</h3>{/if}

{#if $message}<h4>{$message}</h4>{/if}

<form {novalidate} method="POST" use:enhance>
	<AutoComplete form={pageForm} field="sub.tags" {options} taint={false} />
	<div style="margin-top:1rem;">
		<button>Submit</button>
		<button formnovalidate>Submit formnovalidate</button>
		<input type="checkbox" bind:checked={novalidate} on:click={() => (novalidate = !novalidate)} /> novalidate
		on form
	</div>
</form>

<SuperDebug data={{ $form, $errors, $tainted }} />

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
