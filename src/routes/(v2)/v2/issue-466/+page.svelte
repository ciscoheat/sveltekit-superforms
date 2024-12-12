<script lang="ts">
	import { superForm } from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';

	export let data;

	let toggle = false;
	let updatedCount = 0;
	let updateCount = 0;

	const { enhance, form } = superForm(data.form, {
		validators: zodClient(schema),
		onUpdate: () => updateCount++
	});

	const onUpdated = () => updatedCount++;
</script>

<button on:click={() => (toggle = !toggle)}>Toggle</button>

{#if toggle}
	<form method="post" use:enhance={{ onUpdated }}>
		<input type="text" name="name" bind:value={$form.name} />
		<button type="submit">Submit</button>
	</form>
{/if}

<hr />

<p>Update count : {updateCount}</p>
<p>Updated count : {updatedCount}</p>
