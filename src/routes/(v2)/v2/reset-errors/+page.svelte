<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, message, enhance, reset, tainted } = superForm(data.form, {
		validators: zodClient(schema),
		taintedMessage: false
	});

	const resetForm = () => {
		console.log($errors);
		reset();
	};
</script>

<SuperDebug data={{ $errors, $tainted }} />

<h3>Reset errors</h3>

<p>
	Submit, click reset form, then type a character in the name field. No errors should be displayed.
</p>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form id="testForm" method="POST" use:enhance>
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

	<button type="reset" on:click|preventDefault={() => resetForm()}>Reset Form</button>

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
