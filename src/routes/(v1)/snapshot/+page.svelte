<script lang="ts">
	import type { PageData, Snapshot } from './$types.js';
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	export const snapshot: Snapshot = {
		capture: () => {
			// eslint-disable-next-line svelte/valid-compile
			console.log('Capture', $page);
			return capture();
		},
		restore: (value) => {
			console.log('Restore', value, $page);
			restore(value);
		}
	};

	const { form, errors, enhance, delayed, message, constraints, capture, restore } = superForm(
		data.form,
		{
			taintedMessage: null,
			onUpdated() {
				console.log($page.status);
			}
		}
	);
</script>

<SuperDebug data={{ $form, capture: capture() }} />

<a href="/">&lt; Back to start</a>

<h1>Snapshot test</h1>

{#if $message}
	<h3 class:invalid={$page.status >= 400}>{$message}</h3>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" data-invalid={$errors.name} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		E-mail<br />
		<input
			name="email"
			type="email"
			data-invalid={$errors.email}
			bind:value={$form.email}
			{...$constraints.email}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button>Submit</button>
	{#if $delayed}Working...{/if}
</form>

<style>
	.invalid {
		color: red;
	}

	.danger {
		background-color: brown;
	}
</style>
