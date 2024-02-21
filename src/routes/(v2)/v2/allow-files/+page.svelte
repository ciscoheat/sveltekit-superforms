<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';

	export let data;

	// Doesn't work well with testing client-side validation for files
	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		resetForm: true,
		// eslint-disable-next-line svelte/valid-compile
		validators: $page.url.searchParams.has('client') ? zod(schema) : undefined
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
	<label>
		Upload file, max 10 Kb: <input
			on:input={(e) => ($form.avatar = e.currentTarget.files?.item(0) ?? null)}
			accept="image/png, image/jpeg"
			name="avatar"
			type="file"
		/>
		{#if $errors.avatar}<span class="invalid">{$errors.avatar}</span>{/if}
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
