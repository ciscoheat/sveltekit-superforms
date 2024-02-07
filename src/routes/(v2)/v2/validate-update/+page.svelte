<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, message, enhance, validateForm } = superForm(data.form, {
		validators: zod(schema)
		//dataType: 'json',
	});

	async function checkAndValidate() {
		console.log(await validateForm({ update: true }));
	}
</script>

<p>Validate on client, name error should be displayed.</p>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div>
		<button type="button" on:click={checkAndValidate}>Validate</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
