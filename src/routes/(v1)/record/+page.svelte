<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	let postedData: Record<string, number>;

	const { form, enhance, options } = superForm(data.form, {
		dataType: 'json',
		onUpdated({ form }) {
			postedData = form.data.data;
		}
	});

	function addANumber() {
		$form.data['third'] = 3;
		options.resetForm = true;
	}
</script>

<SuperDebug data={$form} />

{#if postedData}
	<br />
	<SuperDebug status={false} label="Posted" data={postedData} />
{/if}

<button on:click={addANumber}>Add a number</button>

<form method="POST" use:enhance>
	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
