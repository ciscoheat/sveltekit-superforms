<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { _schema } from './+page.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;
	let isLoading = false;

	const { form, errors, enhance, message } = superForm(data.form, {
		SPA: true,
		validators: zod(_schema),
		dataType: 'json',
		applyAction: false,
		async onUpdate({ form }) {
			if (!form.valid) {
				return;
			}

			isLoading = true;
			await new Promise((resolve) => setTimeout(resolve, 1000));
			form.message = 'Posted ok!';
			isLoading = false;
		}
	});
</script>

<h3>SPA onUpdate</h3>

<SuperDebug data={$form} />

{#if $message}
	<h4>{$message}</h4>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" data-invalid={$errors.name} bind:value={$form.name} disabled={isLoading} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<style>
	.invalid {
		color: red;
	}

	input {
		background-color: #ddd;
	}
</style>
