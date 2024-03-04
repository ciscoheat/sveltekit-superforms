<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { ZodIssueCode } from 'zod';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, message, enhance, tainted, validate } = superForm(data.form, {
		taintedMessage: null,
		dataType: 'json',
		validators: zod(
			schema.superRefine((current, ctx) => {
				if (!current.name.includes('hello')) {
					console.log('This has been played but no error is added until I update email input');
					ctx.addIssue({
						code: ZodIssueCode.custom,
						path: ['email'],
						message: 'name should contain hello'
					});
				}
			})
		)
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<h3>Superforms testing ground - Zod</h3>
Please update 'Name' field.<br />
<b>Expected</b> : Email should be present in $errors since it depends on 'name' field<br />
<b>Actual</b>: No error on Email field until email is updated<br />

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input
			name="name"
			aria-invalid={$errors.name ? 'true' : undefined}
			on:change={() => validate('email')}
			bind:value={$form.name}
		/>
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
