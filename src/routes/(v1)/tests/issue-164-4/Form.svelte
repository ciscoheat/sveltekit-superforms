<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';

	const dispatch = createEventDispatcher();

	const frm = superForm($page.data.form);
	const { form, errors, message, enhance, reset } = frm;

	page.subscribe(($page) => {
		console.log('🚀 ~ file: Form.svelte:18 ~ page.subscribe ~ page:', $page.data.form.data);
	});
</script>

<!-- SuperDebug label="Form" data={$form} /-->

{#if $message}
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
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

	<button disabled>Submit</button>
	<button
		type="button"
		on:click={() => {
			reset();
			console.log('Resetted:', get(frm.form));
			setTimeout(() => dispatch('cancel'), 500);
		}}>Cancel</button
	>
</form>

<hr />
<p>
	<a target="_blank" href="https://superforms.vercel.app/api">API Reference</a>
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
