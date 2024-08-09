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
	.invalid {
		color: red;
	}

	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	input {
		background-color: #ddd;
	}

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
