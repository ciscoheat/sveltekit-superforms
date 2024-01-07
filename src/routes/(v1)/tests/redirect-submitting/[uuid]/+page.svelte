<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';

	export let data: PageData;

	// Client API:
	const { enhance, form, submitting } = superForm(data.form);

	$: console.log('submitting', $submitting);
</script>

<a href="/tests/redirect-submitting">Back</a>
<form use:enhance method="POST">
	<label for="name">Name</label>
	<input type="text" name="name" bind:value={$form.name} />

	<div><button disabled={$submitting}>Submit</button></div>
</form>
