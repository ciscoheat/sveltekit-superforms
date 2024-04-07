<script lang="ts">
	import { superForm, fileProxy } from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, enhance, errors, message } = superForm(data.form, {
		validators: zodClient(schema)
	});

	const file = fileProxy(form, 'file');
</script>

<SuperDebug data={{ $form, $message }} />

<form method="POST" enctype="multipart/form-data" use:enhance>
	<input type="file" name="file" accept="image/png, image/jpeg" bind:files={$file} />
	{#if $errors.file}<span>{$errors.file}</span>{/if}
	<button>Submit</button>
</form>
