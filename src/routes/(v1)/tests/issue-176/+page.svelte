<script lang="ts">
	import { setError, setMessage, superForm, defaults } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';

	import { page } from '$app/stores';
	import { z } from 'zod';

	const loginSchema = z.object({
		email: z.string().email(),
		password: z.string().min(8)
	});

	const { form, errors, message, constraints, enhance } = superForm(defaults(zod(loginSchema)), {
		SPA: true,
		validators: zod(loginSchema),
		onUpdate({ form }) {
			if (form.data.email.includes('spam')) {
				setError(form, 'email', 'Suspicious email address.');
			} else if (form.valid) {
				setMessage(form, 'Valid data!');
			}
		},
		onError({ result }) {
			$message = result.error.message;
		}
	});
</script>

<h3>#176</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	{#if $errors._errors}
		<div class="status error">{$errors._errors}</div>
	{/if}

	<label for="email">E-mail</label>
	<input
		name="email"
		type="email"
		data-invalid={$errors.email}
		bind:value={$form.email}
		{...$constraints.email}
	/>
	{#if $errors.email}
		<span class="invalid">{$errors.email}</span>
	{/if}

	<label for="password">Password</label>
	<input
		name="password"
		type="password"
		data-invalid={$errors.password}
		bind:value={$form.password}
		{...$constraints.password}
	/>
	{#if $errors.password}
		<span class="invalid">{$errors.password}</span>
	{/if}

	<button>Submit</button>
</form>

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

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
