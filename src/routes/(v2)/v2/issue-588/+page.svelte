<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	$effect(() => {
		const interval = setInterval(() => {
			console.log('!~!!! here');
			invalidateAll();
		}, 2000);
		return () => clearInterval(interval);
	});

	const { form, errors, message, enhance } = superForm(
		untrack(() => data.form),
		{
			applyAction: 'never',
			resetForm: true,
			taintedMessage: false
		}
	);
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground</h3>

<p id="counter">{data.count}</p>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
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
