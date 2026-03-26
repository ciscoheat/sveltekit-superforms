<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import FileInput from './FileInput.svelte';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null
	});
	const acceptedExtensions = '.flac, .mp3';
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
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
	<FileInput
		name="track"
		label="Track"
		accept={acceptedExtensions}
		bind:value={$form.track}
		errors={$errors.track}
	/>

	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

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
