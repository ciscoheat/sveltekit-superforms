<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { superForm } from '$lib/index.js';
	import Form from './Form.svelte';
	import { enhance } from '$app/forms';

	let {
		data
	}: {
		data: PageData;
	} = $props();

	const superforms = $derived(
		data.grid_forms.map((grid_form) =>
			superForm(grid_form, {
				dataType: 'json'
			})
		)
	);
</script>

{#each superforms as form}
	<Form {form} />
{/each}

<form method="post" use:enhance>
	<button type="submit">Add</button>
</form>
