<script lang="ts">
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	import { schemaStep1, schemaStep2 } from './schema.js';

	export let data;

	const schemas = [zod(schemaStep1), zod(schemaStep2)];
	let step = 1;

	const { form, errors, message, enhance, validateForm, options } = superForm(data.form, {
		resetForm: true,
		// No need for name attributes or hidden fields with dataType: 'json'
		dataType: 'json',
		async onSubmit({ cancel }) {
			// If on last step, make a normal request
			if (isLastStep) return;
			else cancel();

			// Make a manual client-side validation, since we have cancelled.
			const result = await validateForm({ update: true });
			if (result.valid) step = step + 1;
		},

		async onUpdated({ form }) {
			if (form.valid) step = 1;
		}
	});

	$: options.validators = schemas[step - 1];
	$: isLastStep = step == schemas.length;
</script>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<h3>Step {step}</h3>

<form method="POST" use:enhance>
	{#if step == 1}
		<label>
			Name<br />
			<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>
		<button>Next step</button>
	{:else}
		<p>Hello {$form.name}, just one more step!</p>
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
	{/if}
</form>

<SuperDebug data={$form} />

<hr />
<p><a target="_blank" href="https://superforms.rocks/">Created with Superforms for SvelteKit</a></p>

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
