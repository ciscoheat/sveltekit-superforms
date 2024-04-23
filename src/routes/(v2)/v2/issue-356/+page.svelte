<script lang="ts">
	import { zodClient } from '$lib/adapters/zod.js';
	import SuperDebug, { defaults, superForm } from '$lib/index.js';
	import { schema } from './schema.js';

	const defaultData = {
		id: 'abc123',
		url: 'https://google.com',
		title: 'Google',
		description: 'search engine',
		image: 'https://github.com/ndom91.png'
	};

	const { form, errors, constraints, enhance } = superForm(
		defaults(defaultData, zodClient(schema)),
		{
			resetForm: false,
			dataType: 'json',
			validators: zodClient(schema),
			onUpdated: ({ form }) => {
				if (form.valid) {
					console.log('Successful submission');
				}
			},
			onError: ({ result }) => {
				console.error(result);
			}
		}
	);

	$inspect('form', $form);
</script>

<section>
	<h1 class="mb-8">sveltekit-superform 2 repro</h1>

	<form method="POST" action="?/saveMetadata" use:enhance class="flex flex-col gap-2 no-wrap">
		<label for="title">ID</label>
		<input
			type="text"
			id="id"
			bind:value={$form.id}
			aria-invalid={$errors.id ? 'true' : undefined}
			{...$constraints.id}
			class="flex py-2 px-3 w-full h-10 text-sm bg-white rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none border-neutral-100 ring-offset-background file:border-0 file:bg-white file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
		/>
		{#if $errors.id}<span class="text-xs text-red-400">{$errors.id}</span>{/if}
		<label for="title">Title</label>
		<input
			type="text"
			id="title"
			bind:value={$form.title}
			aria-invalid={$errors.title ? 'true' : undefined}
			{...$constraints.title}
			class="flex py-2 px-3 w-full h-10 text-sm bg-white rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none border-neutral-100 ring-offset-background file:border-0 file:bg-white file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
		/>
		{#if $errors.title}<span class="text-xs text-red-400">{$errors.title}</span>{/if}
		<label for="url">URL</label>
		<input
			type="url"
			id="url"
			bind:value={$form.url}
			aria-invalid={$errors.url ? 'true' : undefined}
			{...$constraints.url}
			class="flex py-2 px-3 w-full h-10 text-sm bg-white rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none border-neutral-100 ring-offset-background file:border-0 file:bg-white file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
		/>
		{#if $errors.url}<span class="text-xs text-red-400">{$errors.url}</span>{/if}
		<label for="description">Description</label>
		<input
			type="text"
			id="description"
			bind:value={$form.description}
			aria-invalid={$errors.description ? 'true' : undefined}
			{...$constraints.description}
			class="flex py-2 px-3 w-full h-10 text-sm bg-white rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none border-neutral-100 ring-offset-background file:border-0 file:bg-white file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
		/>
		{#if $errors.description}<span class="text-xs text-red-400">{$errors.description}</span>{/if}
		<label for="image">Image</label>
		<input
			type="url"
			id="image"
			bind:value={$form.image}
			aria-invalid={$errors.image ? 'true' : undefined}
			{...$constraints.image}
			class="flex py-2 px-3 w-full h-10 text-sm bg-white rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none border-neutral-100 ring-offset-background file:border-0 file:bg-white file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
		/>
		{#if $errors.image}<span class="text-xs text-red-400">{$errors.image}</span>{/if}
		<button
			class="inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-zinc-200 text-primary-foreground hover:bg-zinc-400/90 h-10 px-4 py-2 w-full"
			type="submit">Submit</button
		>
		<SuperDebug data={$form} />
	</form>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}
</style>
