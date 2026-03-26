<script lang="ts">
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	const { form, enhance, tainted, isTainted } = superForm(data.form, {
		dataType: 'json'
	});

	isTainted('details');
	isTainted($tainted?.details);
	// @ts-expect-error Invalid path
	isTainted('nope');
</script>

<SuperDebug data={{ $form, $tainted }} />

<div>TAINTED:{isTainted($tainted)}</div>

<form method="POST" use:enhance>
	<button
		type="button"
		on:click={() =>
			($form.details = [...$form.details, { name: 'John Doe', email: 'john_doe@example.com' }])}
		>Add name</button
	>
	<button type="button" on:click={() => ($form.details = $form.details.slice(1))}
		>Remove name</button
	>
	<div><button>Submit</button></div>
</form>

<div style="margin-top:2rem;">
	<a target="_blank" href="https://superforms.rocks/get-started">Tutorial for this example here</a>
</div>
