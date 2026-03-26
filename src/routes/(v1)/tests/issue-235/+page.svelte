<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';

	export let data: PageData;

	const { form, errors, message, enhance, validate } = superForm(data.form);
</script>

<SuperDebug
	data={{
		$form: $form,
		$errors: $errors,
		validate: validate
	}}
/>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<fieldset role="radiogroup">
		<legend>Radio Group</legend>
		<label>
			<input type="radio" name="radioGroup" value={true} bind:group={$form.radioGroup} />
			Yes
		</label>
		<label>
			<input type="radio" name="radioGroup" value={false} bind:group={$form.radioGroup} />
			No
		</label>
	</fieldset>
	<hr />
	<label>
		<input type="checkbox" name="checkbox" bind:checked={$form.checkbox} /> Checkbox
	</label>
	<button>Submit</button>
</form>

<style>
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

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
