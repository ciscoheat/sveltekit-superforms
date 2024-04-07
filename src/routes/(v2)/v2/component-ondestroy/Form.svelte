<script lang="ts">
	import { schema } from './schema.js';
	import z from 'zod';
	import type { SuperForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	let {
		form
	}: {
		form: SuperForm<z.infer<typeof schema>>;
	} = $props();

	let { form: item, enhance } = form;
</script>

<hr />
<form action="?/save" method="post" use:enhance>
	<SuperDebug data={$item} />
</form>
