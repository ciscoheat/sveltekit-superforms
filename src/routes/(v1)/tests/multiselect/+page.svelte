<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { formSchema, optionsSchema } from './schemas.js';

	export let data;

	const { form, enhance, message, errors, allErrors, tainted } = superForm(data.form, {
		dataType: 'json',
		validators: zod(formSchema),
		validationMethod: 'onblur'
	});

	$: console.log($allErrors);
	const options = optionsSchema._def.innerType.options;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<p>{$message.message}</p>{/if}

<form method="POST" use:enhance>
	<div>
		<label for="multiselect">Multiselect</label>
		<select
			multiple
			name="multiselect"
			bind:value={$form.multiselect}
			data-invalid={$errors.multiselect}
		>
			{#each options as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="select">Select</label>
		<select name="select" bind:value={$form.select} data-invalid={$errors.select}>
			{#each options as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</div>
	{#if $allErrors && $allErrors.length}
		<ul class="invalid">
			{#each $allErrors as error}<li>
					{String(error.path)}: {error.messages}
				</li>{/each}
		</ul>
	{/if}

	<button type="submit">Submit</button>
</form>

<style>
	label {
		display: block;
		margin-left: 5px;
	}
	.invalid {
		color: red;
	}
	button {
		background-color: black;
		color: white;
		padding: 5px;
		display: inline-block;
		margin: 5px;
	}
</style>
