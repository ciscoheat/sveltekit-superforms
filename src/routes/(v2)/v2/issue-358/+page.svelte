<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	// eslint-disable-next-line svelte/valid-compile
	const resetForm = $page.url.searchParams.has('reset');

	const { form, errors, message, enhance, reset, tainted } = superForm(data.form, {
		invalidateAll: 'force',
		resetForm
	});
</script>

<SuperDebug data={{ $form, $tainted }} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<div class="status">
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			type="email"
			aria-invalid={$errors.email ? 'true' : undefined}
			bind:value={$form.email}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button>Submit</button>
	<button type="button" on:click={() => reset()} style="background-color: darkred">Reset</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

<style>
	.invalid {
		color: red;
	}

	.status {
		color: white;
		background-color: darkkhaki;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
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
