<script lang="ts">
	import { page } from '$app/stores';
	import { formFieldProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const formData = superForm(data.form);
	const { message, enhance } = formData;

	const { errors, value } = formFieldProxy(formData, 'name');
	// This type cast should not be necessary, it should infer the type SuperForm<typeof schema, Message>
	//const x = formFieldProxy(formData as SuperForm<typeof schema, unknown>, 'name');
</script>

<SuperDebug data={formData.form} />

<h3>Superforms testing ground</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message.type}: {$message.text}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors ? 'true' : undefined} bind:value={$value} />
		{#if $errors}<span class="invalid">{$errors}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<hr />
<p>
	<a target="_blank" href="https://superforms.rocks/api">API Reference</a>
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
