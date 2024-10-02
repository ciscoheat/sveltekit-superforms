<script lang="ts">
	import { page } from '$app/stores';
	import { defaults, superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { arktype } from '$lib/adapters/arktype.js';
	import { schema } from './schema.js';
	import type { ActionResult } from '@sveltejs/kit';

	const defaultData = { name: '', email: '' };
	const adapter = arktype(schema, { defaults: defaultData });
	const data = defaults(adapter);

	let options = ['onSubmit', 'onResult', 'onUpdate'] as const;
	let option: (typeof options)[number] = 'onSubmit';

	let error: Extract<ActionResult, { type: 'error' }>;

	const { form, message, enhance, submitting } = superForm(data, {
		SPA: true,
		validators: arktype(schema, { defaults: defaultData }),
		async onSubmit() {
			if (option == 'onSubmit') {
				throw new Error('onSubmit error');
			}
		},
		async onResult() {
			if (option == 'onResult') {
				throw new Error('onResult error');
			}
		},
		async onUpdate() {
			if (option == 'onUpdate') {
				throw new Error('onUpdate error');
			}
		},
		onError({ result }) {
			error = result;
		}
	});
</script>

<SuperDebug data={{ $form, option }} />

<h3>SPA onError</h3>

{#if error}
	<h4>ERROR {error.status}: {error.error}</h4>
{/if}

<h5>Submitting: {String($submitting)}</h5>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<div>
	{#each options as opt}
		<input type="radio" bind:group={option} value={opt} /> {opt}<br />
	{/each}
</div>

<form method="POST" use:enhance>
	<div class="submit">
		<button>Submit</button>
		{#if $submitting}Loading...{/if}
	</div>
</form>

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
</p>

<style>
	.submit {
		display: flex;
		align-items: center;
	}

	.submit button {
		margin: 0 0.5rem;
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
