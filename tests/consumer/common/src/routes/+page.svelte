<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { zodClient as directClient } from 'sveltekit-superforms/adapters/zod4.js';
	import SuperDebug from 'sveltekit-superforms/SuperDebug.svelte';
	import LegacyDebug from 'sveltekit-superforms/client/SuperDebug.svelte';
	import { schema } from '../lib/schema.js';
	import type { PageData } from './$types';

	export let data: PageData;
	const { form, enhance } = superForm(data.form, {
		validators: zod4Client(schema),
		onResult({ result }) {
			if (result.type === 'failure') console.log(result.status);
		}
	});
	void directClient(schema);
</script>

<form method="POST" use:enhance>
	<input name="name" aria-label="Name" bind:value={$form.name} />
	<button>Submit</button>
</form>
<SuperDebug data={$form} />
<LegacyDebug data={$form} />
