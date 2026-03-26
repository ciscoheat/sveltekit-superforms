<script lang="ts">
	import type { PageData } from './$types.js';
	import Form from './Form.svelte';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;
	console.log('🚀 ~ file: +page.svelte:7 ~ page created:', data.form.data);

	let isEditing = false;
	const toggleEdit = (enable: boolean) => {
		isEditing = !!enable;
	};

	$: console.log('initial data.form:', data.form.data);
</script>

<div>isEditing: {isEditing}</div>
{#if isEditing}
	<Form data={data.form} cancel={() => toggleEdit(false)} />
{:else}
	<button type="button" on:click={() => toggleEdit(true)}>Edit</button>
{/if}

<SuperDebug data={data.form} />
