<script lang="ts">
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { schema } from './schema.js';
	import { zodClient } from '$lib/adapters/zod.js';

	export let data;

	const { form, enhance } = superForm(data.form, {
		dataType: 'json',
		validators: zodClient(schema)
	});
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
	<div><button>Submit</button></div>
</form>

<div style="margin-top:2rem;">
	<a target="_blank" href="https://superforms.rocks/get-started">Tutorial for this example here</a>
</div>
