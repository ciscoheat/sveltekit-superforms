<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { userSchema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data;

	const { form, errors, message, enhance, tainted } = superForm(data.form, {
		customValidity: false,
		validators: zod(userSchema),
		taintedMessage: null
	});

	const salutations = [
		{ id: 1, text: 'one' },
		{ id: 2, text: 'two' }
	];
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<h3>Superforms testing ground</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Salutation<br />
		<select name="salutationId" id="salutationId" bind:value={$form.salutationId}>
			<option value={0} selected>Choose Option</option>
			{#each salutations as salutation}
				<option value={salutation.id}>
					{salutation.text}
				</option>
			{/each}
		</select>
		{#if $errors.salutationId}<span class="invalid">{$errors.salutationId}</span>{/if}
	</label>
	<br />

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
	<br />

	<label>
		Confirm Email<br />
		<input
			name="confirmEmail"
			type="email"
			aria-invalid={$errors.confirmEmail ? 'true' : undefined}
			bind:value={$form.confirmEmail}
		/>
		{#if $errors.confirmEmail}<span class="invalid">{$errors.confirmEmail}</span>{/if}
	</label>
	<br />

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
