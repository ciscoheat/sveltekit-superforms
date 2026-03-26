<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, errors, enhance, message } = superForm(data.form, {
		onError: ({ result }) => {
			$message = result.error.message;
		}
	});
</script>

<SuperDebug data={{ $form, $message }} />

{#if $message}
	<div class="invalid">Error message: {$message}</div>
{/if}

<form method="POST" action="/tests/issue-227/endpoint" use:enhance>
	<label for="name">Name</label>
	<input
		type="text"
		name="name"
		aria-invalid={$errors.name ? 'true' : undefined}
		bind:value={$form.name}
	/>
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

	<label for="email">E-mail</label>
	<input
		type="email"
		name="email"
		aria-invalid={$errors.email ? 'true' : undefined}
		bind:value={$form.email}
	/>
	{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}

	<div><button>Submit</button></div>
</form>

<style>
	.invalid {
		color: red;
		padding: 1rem 0;
		font-weight: bold;
	}
</style>
