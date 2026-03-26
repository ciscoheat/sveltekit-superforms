<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	console.dir(data, { depth: 10 }); //debug

	const { form, errors, message, enhance } = superForm(data.form);
	const { form: otherForm, errors: otherErrors, enhance: otherEnhance } = superForm(data.otherForm);
</script>

<SuperDebug data={$form} />

<h3>Fill in an email and the provider should be added.</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
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

<form method="POST" use:otherEnhance>
	<label>
		Provider<br />
		<input
			name="other"
			aria-invalid={$otherErrors.provider ? 'true' : undefined}
			bind:value={$otherForm.provider}
		/>
		{#if $otherErrors.provider}<span class="invalid">{$otherErrors.provider}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
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
