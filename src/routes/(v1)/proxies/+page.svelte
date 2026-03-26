<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import ProxyField from './ProxyField.svelte';

	export let data: PageData;

	let status: boolean | undefined = undefined;

	const form = superForm(data.form, {
		onUpdated({ form }) {
			status = form.data.bool;
		}
	});
	const formData = form.form;
	const enhance = form.enhance;
</script>

<SuperDebug data={$formData} />

{#if status === true}
	<div>Posted as checked</div>
{:else if status === false}
	<div>Posted as unchecked</div>
{:else}
	<div>Not posted yet</div>
{/if}

<form method="POST" use:enhance>
	<ProxyField name="bool" label="Check me" type="checkbox" {form} field="bool" />
	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
