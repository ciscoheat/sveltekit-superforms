<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';

	export let data;

	const { form, formId, errors, message, capture, restore /*, enhance*/ } = superForm(data.form, {
		// Don't reset between steps!
		resetForm: false
	});

	// Snapshots takes care of navigating back
	export const snapshot = { capture, restore };

	$: step = $message?.step ?? 1;
</script>

{#if $message?.text}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message.text}
	</div>
{/if}

<h3>Step {step}</h3>

<form method="POST">
	<!-- Separate step counter (not part of schema) -->
	<input type="hidden" name="step" bind:value={step} />
	<!-- Need this, since use:enhance is not added to the form and schemas are switching between steps: -->
	<input type="hidden" name="__superform_id" bind:value={$formId} />
	{#if step == 1}
		<label>
			Name<br />
			<input
				name="name"
				type="text"
				aria-invalid={$errors.name ? 'true' : undefined}
				bind:value={$form.name}
			/>
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>
		<button>Next</button>
	{:else}
		<input type="hidden" name="name" bind:value={$form.name} />
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
