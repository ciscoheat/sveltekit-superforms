<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import { schemasafe } from '$lib/adapters/schemasafe.js';
	import SuperDebug from '$lib/index.js';
	import { schema } from './schema.js';

	let { data } = $props();

	const validators = schemasafe(schema);

	const { form, errors, constraints, message, enhance } = superForm(
		untrack(() => data.form),
		{
			dataType: 'json',
			resetForm: false,
			validators,
			validationMethod: 'oninput'
		}
	);
</script>

<SuperDebug data={{ $form, $errors, $constraints }} />

<h3>Superforms testing ground - JSON Schema</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	{#each $form.arr as firstArr, i}
		{#each firstArr.arr as secondArr, j}
			<input
				type="text"
				bind:value={secondArr.tryInvalidValue}
				placeholder="Try entering text shorter than 5 chars"
			/>
			{#if $errors?.arr?.[i]?.arr?.[j]?.tryInvalidValue}<span class="invalid"
					>Please enter a valid email</span
				>{/if}
		{/each}
	{/each}
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
