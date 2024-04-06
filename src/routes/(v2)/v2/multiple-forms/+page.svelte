<script lang="ts">
	import type { PageData } from './$types.js';
	import { superForm } from '$lib/client/index.js';
	import Form from './Form.svelte';
	import { enhance } from '$app/forms';

	let {
		data
	}: {
		data: PageData;
	} = $props();

	const superforms = $derived(data.item_forms.map(item_form => superForm(item_form, {
		id: item_form.id,
		dataType: 'json'
	})));
</script>

{#each superforms as superform (superform.formId)}
	<Form {superform} />
	<hr>
{/each}

<form action="?/create" method=post use:enhance>
	<button type=submit>Add</button>
</form>