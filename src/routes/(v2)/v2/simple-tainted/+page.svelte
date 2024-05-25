<script lang="ts">
	import { superForm } from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod.js';
	import type { PageData } from './$types.js';
	import { schema } from './schema.js';

	export let data: PageData;

	const { form, errors, constraints, message, enhance, tainted, isTainted } = superForm(data.form, {
		dataType: 'json',
		validators: zodClient(schema)
	});
</script>

{#if $message}<h3>{$message}</h3>{/if}

<form method="POST" use:enhance>
	<label for="name">Name</label>
	<input
		type="text"
		name="name"
		aria-invalid={$errors.name?.value ? 'true' : undefined}
		bind:value={$form.name.value}
		{...$constraints.name?.value}
	/>
	{#if $errors.name?.value}<span class="invalid">{$errors.name.value}</span>{/if}

	<label for="email">E-mail</label>
	<input
		type="email"
		name="email"
		aria-invalid={$errors.email?.value ? 'true' : undefined}
		bind:value={$form.email.value}
		{...$constraints.email?.value}
	/>
	{#if $errors.email?.value}<span class="invalid">{$errors.email.value}</span>{/if}

	<div><button>Submit</button></div>
</form>

<p id="tainted">Tainted: {isTainted($tainted)}</p>
<p id="email-tainted">Tainted email: {isTainted($tainted?.email)}</p>

<style>
	.invalid {
		color: red;
	}
</style>
