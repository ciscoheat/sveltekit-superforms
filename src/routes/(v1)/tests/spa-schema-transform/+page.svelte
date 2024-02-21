<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data;

	// eslint-disable-next-line svelte/valid-compile
	let SPA = $page.url.searchParams.has('SPA') || undefined;

	const { form, errors, message, enhance, validate, validateForm } = superForm(data.form, {
		SPA,
		taintedMessage: null,
		validators: zod(schema),
		onUpdate({ form }) {
			if (SPA && form.valid) form.message = 'SPA form posted OK';
		}
	});

	let customCheck = '';

	async function validateCheck() {
		const result = (await validateForm()).data;
		customCheck = `${result.name} - ${result.email} - ${await validate('email')}`;
	}
</script>

<SuperDebug data={$form} />

<h3>Superforms client-side validation</h3>

{#if $message}
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<p>{customCheck}</p>

<form method="POST" novalidate use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			aria-invalid={$errors.email ? 'true' : undefined}
			bind:value={$form.email}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button>Submit</button>
	<button type="button" on:click={validateCheck}>Manual validate</button>
</form>

<hr />
<p>
	<a target="_blank" href="https://superforms.rocks/api">API Reference</a>
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
