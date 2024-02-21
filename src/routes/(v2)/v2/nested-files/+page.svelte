<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { superForm } from '$lib/client/index.js';
	//import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';

	export let data;

	// Doesn't work well with testing client-side validation for files
	const { form, errors, message, enhance } = superForm(data.form, {
		dataType: 'json',
		// eslint-disable-next-line svelte/valid-compile
		validators: $page.url.searchParams.has('client') ? zod(schema) : undefined,
		taintedMessage: false
	});
</script>

<!-- SuperDebug data={{ $form, $errors, $tainted }} / -->

<hr />

{#if $message}<h4>{$message}</h4>{/if}

<p>{$form.image ? 'Image exists' : 'No image'}</p>
<p>{$form.images.length ? `${$form.images.length} image(s)` : 'No multiple images'}</p>

<form method="POST" enctype="multipart/form-data" use:enhance>
	<label>
		Upload file, max 10 Kb: <input
			on:input={(e) => ($form.image = e.currentTarget.files?.item(0))}
			accept="image/png, image/jpeg"
			name="image"
			type="file"
		/>
		{#if $errors.image}<span class="invalid">{$errors.image}</span>{/if}
	</label>

	<label>
		Upload files, max 10 Kb: <input
			multiple
			on:input={(e) => ($form.images = Array.from(e.currentTarget.files ?? []))}
			accept="image/png, image/jpeg"
			name="images"
			type="file"
		/>
		{#if $errors.images}
			<ul class="invalid">
				{#each Object.keys($errors.images) as key}
					{#if key == '_errors' && $errors.images[key]}
						<li>{$errors.images[key]}</li>
					{:else}
						<li>Image {Number(key) + 1}: {$errors.images[Number(key)]}</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
