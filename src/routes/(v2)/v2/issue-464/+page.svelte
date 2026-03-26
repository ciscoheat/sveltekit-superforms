<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import SuperDebug, { superForm } from '$lib/index.js';
	import CheckboxGroup from './CheckboxGroup.svelte';
	import { schema } from './schema.js';

	export let data;

	const form = superForm(data.form, { validators: zod(schema) });
	const { form: formValues, enhance } = form;
</script>

<SuperDebug data={$formValues} />

<h3>Making FormPathArrays handle single value</h3>

<form method="POST" use:enhance>
	<!-- This will give an error, but can't be ignored in svelte/ts -->
	<!-- CheckboxGroup field="testString" {form} label="test"	options={[ { label: 'Option 1', value: 1 },	{ label: 'Option 2', value: 2 }]} / -->

	<CheckboxGroup
		{form}
		label="test"
		field="testArray"
		options={[
			{ label: 'Option 1', value: 1 },
			{ label: 'Option 2', value: 2 }
		]}
	/>

	<button>Submit</button>
</form>

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
</p>

<style>
	a {
		text-decoration: underline;
	}

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
