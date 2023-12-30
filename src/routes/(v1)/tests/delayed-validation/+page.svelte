<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import { basicSchema } from './schema';
	import { page } from '$app/stores';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { debounce } from 'throttle-debounce';
	import spinner from './tadpole.svg?raw';

	export let data: PageData;

	let checking = false;

	async function checkUsername(username: string, resolve: (result: string | null) => void) {
		checking = true;
		const body = new FormData();
		body.set('username', username);

		const response = await fetch(new URL('/tests/delayed-validation/username', $page.url), {
			method: 'POST',
			body
		});

		resolve(response.status == 200 ? null : 'This username is taken.');
		checking = false;
	}

	const throttledUsername = debounce(300, checkUsername);

	const { form, errors, message, enhance, tainted } = superForm(data.form, {
		dataType: 'json',
		validators: basicSchema
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
