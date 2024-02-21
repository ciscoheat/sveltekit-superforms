<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { editPageSchema } from './schemas.js';
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	// eslint-disable-next-line svelte/valid-compile
	const validationMethod = $page.url.searchParams.has('oninput')
		? 'oninput'
		: $page.url.searchParams.has('onblur')
			? 'onblur'
			: $page.url.searchParams.has('submit-only')
				? 'onsubmit'
				: 'auto';

	const { form, errors, message, enhance, tainted } = superForm(data.form, {
		validators: zod(editPageSchema),
		validationMethod,
		onError: (event) => {
			console.log('onError', event);
		},
		onResult: (event) => {
			console.log('onResult', event);
		},
		onSubmit: (args) => {
			console.log('onSubmit', args);
		}
	});
</script>

<h3>Superforms testing ground</h3>

<SuperDebug data={{ $errors, $tainted }} />

{#if $message}
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

{#if $errors._errors}
	<h4 class="invalid">{$errors._errors}</h4>
{/if}

<form method="POST" use:enhance>
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
<p>{validationMethod}</p>

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

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
