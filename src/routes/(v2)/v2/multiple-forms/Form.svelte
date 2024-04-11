<script lang="ts">
	import type { SuperForm } from '$lib/index.js';
	import type { schema } from './schema.js';
	import { z } from 'zod';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	let { superform }: {
		superform: SuperForm<z.infer<typeof schema>>;
	} = $props();

	let { form, message, enhance } = superform;
</script>

<form action="?/save" method="post" use:enhance>
	<input type="hidden" name="id" value={$form.id} />

	<SuperDebug data={$form} />

	<label>
		<input type="text" name="label" bind:value={$form.label} />
	</label>

	<button type="submit">Save</button>

	{#if $message}
		<p>{$message}</p>
	{/if}
</form>