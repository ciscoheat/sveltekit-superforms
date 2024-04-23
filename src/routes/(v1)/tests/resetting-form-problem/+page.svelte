<script lang="ts">
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import { schema } from './schemas.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	let lockEmail: boolean = true;
	let lockName: boolean = true;
	let lockPassword: boolean = true;

	// Client API:
	const { form, errors, enhance, restore, capture, message } = superForm(data.form, {
		scrollToError: 'smooth',
		autoFocusOnError: true,
		errorSelector: '[data-invalid]',
		validators: zod(schema),
		//resetForm: true,
		clearOnSubmit: 'none'
	});
	export const snapshot = { capture, restore };
	form.subscribe((form) => {
		if (form.email && /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(form.email)) {
			lockEmail = false;
		} else lockEmail = true;
		if (form.name) {
			lockName = false;
		} else lockName = true;
		if (
			form.password &&
			form.confirmPassword &&
			form.password === form.confirmPassword &&
			form.password.length > 5
		) {
			lockPassword = false;
		} else lockPassword = true;
	});

	console.log(lockEmail, lockName, lockPassword);
</script>

<SuperDebug data={$form} />

<div class="flex justify-center items-center h-full w-full">
	{#if $message}<div>**{$message}**</div>{/if}
	<form method="POST" use:enhance>
		<div class="block card p-4 w-screen max-w-xl">
			<div class="flex justify-center items-center mb-4"></div>
			<p>E-mail</p>

			<input
				class="input"
				type="text"
				name="email"
				placeholder="example@email.com"
				bind:value={$form.email}
				data-invalid={$errors.email}
			/>
			{#if $errors.email}<small class="text-red-500">E-mail must be </small>{/if}

			<p>Password</p>
			<input
				class="input"
				type="password"
				name="password"
				placeholder="Password"
				bind:value={$form.password}
				data-invalid={$errors.password}
			/>
			<input
				class="input"
				type="password"
				name="confirmPassword"
				placeholder="Confirm Password"
				bind:value={$form.confirmPassword}
				data-invalid={$errors.confirmPassword}
			/>
			{#if $form.password !== $form.confirmPassword}<small class="text-red-500"
					>Passwords do not match</small
				>
			{:else if $form.password.length < 6}<small class="text-red-500"
					>Your password must be at least 6 characters long</small
				>{/if}

			<p>Name</p>
			<input
				class="input"
				type="text"
				name="name"
				placeholder="John Doe"
				bind:value={$form.name}
				data-invalid={$errors.name}
			/>
			{#if $errors.name}<small class="text-red-500">{$errors.name}</small>{/if}
			{#if $errors.email}<small class="text-red-500">{$errors.email}</small>{/if}

			{#if $errors.password}<small class="text-red-500">{$errors.password}</small>{/if}
		</div>
		<button>Submit</button>
	</form>
</div>
