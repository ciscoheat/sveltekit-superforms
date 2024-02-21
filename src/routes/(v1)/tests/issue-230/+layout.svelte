<script lang="ts">
	import { page } from '$app/stores';
	import { superForm, defaults } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';

	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { z } from 'zod';

	const schema = z.object({
		name: z.string().min(1),
		email: z.string().email()
	});

	const { form, errors, message, enhance } = superForm(defaults(zod(schema)));
</script>

<div style="border: 3px solid red; padding: 10px;">
	<SuperDebug data={$form} />

	<h3>This is from +layout.svelte</h3>

	{#if $message}
		<!-- eslint-disable-next-line svelte/valid-compile -->
		<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
			{$message}
		</div>
	{/if}

	<form method="POST" action="/tests/issue-230" use:enhance>
		<label>
			Name<br />
			<input name="name" data-invalid={$errors.name} bind:value={$form.name} />
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>

		<label>
			Email<br />
			<input name="email" type="email" data-invalid={$errors.email} bind:value={$form.email} />
			{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
		</label>

		<button>Submit</button>
	</form>

	<hr />
	<p>
		<a target="_blank" href="https://superforms.vercel.app/api">API Reference</a>
	</p>
</div>

<div style="border: 2px solid green; padding: 10px; margin-top: 10px;">
	<slot />
</div>

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
