<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';

	export let data: PageData;

	// Client API:
	const { enhance, form, submitting, errors } = superForm(data.form);

	let log: string[] = [];

	submitting.subscribe(($submitting) => {
		if (!log.length && !$submitting) return;
		log = [...log, $submitting ? 'Submitting' : 'Done'];
	});
</script>

<a href="/tests/redirect-submitting">Back</a>
<form use:enhance method="POST">
	<label for="name">Name</label>
	<input type="text" name="name" bind:value={$form.name} />
	{#if $errors.name}{$errors.name}{/if}
	<br /><input type="checkbox" name="same" bind:checked={$form.same} /> Redirect to same url

	<div><button disabled={$submitting}>Submit</button></div>
</form>

<hr />
<pre>
{log.join('\n')}
</pre>
