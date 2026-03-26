<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import { basicSchema } from './schema.js';
	import spinner from './tadpole.svg?raw';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	let checking = false;

	const { form, errors, message, enhance } = superForm(data.form, {
		dataType: 'json',
		validators: zod(basicSchema)
	});
</script>

<h3>Delayed validation</h3>

{#if $message}
	<h4>Message: {$message}</h4>
{/if}

<form method="POST" use:enhance>
	<label for="name">Name</label>
	<input type="text" name="name" data-invalid={$errors.name} bind:value={$form.name} />
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

	<label for="username">Username</label>
	<input type="text" name="username" data-invalid={$errors.username} bind:value={$form.username} />
	{#if checking}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html spinner}
	{:else if 'username' in $errors}
		<span class="invalid">
			{$errors.username ? '❌' : '✅'}
		</span>
	{/if}

	<div><button>Submit</button></div>
</form>

<style>
	.invalid {
		color: red;
	}

	button {
		margin-top: 2rem;
	}
</style>
