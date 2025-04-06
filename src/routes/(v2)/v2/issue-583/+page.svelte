<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	let { data } = $props();

	const { form, errors, message, enhance } = superForm(data.form, { dataType: 'json' });
</script>

<h3>Superforms testing ground - Zod</h3>

<SuperDebug data={$form} />

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<p>Submit and check the error</p>
	{#if $errors.updates?.[0].updates?.dueDate}
		<p class="invalid">{$errors.updates[0].updates.dueDate}</p>
	{/if}
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
