<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import { schema1 } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, enhance } = superForm(data.form1, {
		validators: zod(schema1)
	});
</script>

<form method="POST" use:enhance>
	<input type="text" bind:value={$form.age} name="age" />
	<input type="text" bind:value={$form.value} name="value" />
</form>
