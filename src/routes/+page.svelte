<script lang="ts">
	import { superForm } from '$lib/client';
	import type { PageData } from './$types';

	export let data: PageData;

	const { form, errors, message, delayed, timeout, enhance } = superForm(data.form, {
		invalidateAll: false,
		taintedMessage: undefined,
		validators: {
			email: (n) => (/[\w\.-]+@[\w\.]+\.\w+/.test(n) ? null : 'Invalid email')
		}
	});
</script>

<h1>sveltekit-superforms</h1>

{#if $message}
	<h3>{$message}</h3>
{/if}

<form method="POST" use:enhance>
	<label for="name">Name</label> <input type="text" name="name" bind:value={$form.name} />
	{#if $errors.name}<span data-invalid>{$errors.name}</span>{/if}

	<label for="email">Email</label> <input type="text" name="email" bind:value={$form.email} />
	{#if $errors.email}<span data-invalid>{$errors.email}</span>{/if}

	<label for="delay">Delay</label> <input type="text" name="delay" bind:value={$form.delay} />ms
	{#if $errors.delay}<span data-invalid>{$errors.delay}</span>{/if}

	<div>
		<button>Submit</button>
		{#if $timeout}
			<span class="timeout">Timeout!</span>
		{:else if $delayed}
			<span class="delayed">Delayed...</span>
		{/if}
	</div>
</form>

<style lang="scss">
	[data-invalid] {
		color: red;
	}
</style>
