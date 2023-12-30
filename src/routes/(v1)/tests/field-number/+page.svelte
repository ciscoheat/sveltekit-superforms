<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';
	import { schemaDto } from './schema.js';
	import Input from './Input.svelte';

	export let data: PageData;
	const { form, fields, enhance, delayed } = superForm(data.form, {
		dataType: 'json',
		multipleSubmits: 'prevent'
		//validators: schemaDto
	});
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
	<Input type="number" label="Item Type" field={fields.itemType} />
</form>
