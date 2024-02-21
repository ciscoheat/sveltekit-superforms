<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		// eslint-disable-next-line svelte/valid-compile
		dataType: $page.url.searchParams.has('json') ? 'json' : 'form',
		taintedMessage: null
	});
</script>

<SuperDebug data={$form} />

<h1>sveltekit-superforms upload</h1>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
	<label>
		Filename<br /><input
			name="filename"
			data-invalid={$errors.filename}
			bind:value={$form.filename}
		/>
		{#if $errors.filename}
			<span class="invalid">{$errors.filename}</span>
		{/if}
	</label>

	<input
		name="file"
		type="file"
		accept="image/png, image/gif, image/jpeg"
		data-invalid={$errors.file}
		bind:value={$form.file}
	/>
	{#if $errors.file}
		<span class="invalid">{$errors.file}</span>
	{/if}

	<div>
		<button>Submit</button>
		{#if $delayed}Working...{/if}
	</div>
</form>

<style lang="scss">
	.invalid {
		color: red;
	}
</style>
