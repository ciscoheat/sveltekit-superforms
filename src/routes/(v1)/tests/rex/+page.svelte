<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import { basicSchema, refined } from './schema.js';
	import { page } from '$app/stores';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	// eslint-disable-next-line svelte/valid-compile
	const validators = $page.url.searchParams.has('refined') ? refined : basicSchema;

	// Client API:
	const { form, errors, message, enhance, tainted } = superForm(data.form, {
		dataType: 'json',
		validators: zod(validators),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		validationMethod: ($page.url.searchParams.get('method') ?? undefined) as any
	});
</script>

<SuperDebug data={{ $errors, $tainted }} />

<h4>Validation method: {$page.url.searchParams.get('method') ?? 'auto'}</h4>
<h4>
	Schema: {$page.url.searchParams.has('refined') ? 'refined' : 'simple'}
</h4>

<form method="POST" use:enhance>
	{#if $message}
		<div>Message: {$message}</div>
		<br />
	{/if}
	<label for="name">Name</label>
	<input type="text" name="name" data-invalid={$errors.name} bind:value={$form.name} />
	<!-- {...$constraints.name} -->
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

	<label for="email">E-mail</label>
	<input type="text" name="email" data-invalid={$errors.email} bind:value={$form.email} />
	<!-- {...$constraints.email} -->
	{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}

	<div class="tag-errors">
		{#if $errors.tags?._errors}
			<b class="invalid">{$errors.tags?._errors}</b>
		{/if}
	</div>

	<div class="tags">
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each $form.tags as _, i}
			<div>
				<label for="min">Min</label>
				<input data-invalid={$errors.tags?.[i]?.min} bind:value={$form.tags[i].min} type="number" />
				{#if $errors.tags?.[i]?.min}
					<br />
					<span class="invalid">{$errors.tags[i].min}</span>
				{/if}
			</div>
			<div>
				<label for="max">Max</label>
				<input data-invalid={$errors.tags?.[i]?.max} bind:value={$form.tags[i].max} type="number" />
				{#if $errors.tags?.[i]?.max}
					<br />
					<span class="invalid">{$errors.tags[i].max}</span>
				{/if}
			</div>
		{/each}
	</div>

	<button on:click={() => ($form.tags = [...$form.tags, { min: 10, max: 5 }])} type="button"
		>Add tag</button
	>

	<button
		on:click={() => {
			if ($form.tags.length > 0) $form.tags = $form.tags.slice(0, -1);
		}}
		type="button"
		class="remove">Remove last tag</button
	>

	<div><button>Submit</button></div>
</form>

<style>
	.invalid {
		color: red;
	}

	.remove {
		background-color: brown;
	}

	button {
		margin-top: 2rem;
	}
</style>
