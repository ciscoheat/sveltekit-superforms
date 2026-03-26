<script lang="ts">
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	const { form, enhance } = superForm(data.form, {
		SPA: true,
		dataType: 'json'
	});
</script>

<SuperDebug data={$form} />

<h3>Reusable Zod schemas</h3>

<form method="POST" use:enhance>
	<button>Submit</button>
</form>
