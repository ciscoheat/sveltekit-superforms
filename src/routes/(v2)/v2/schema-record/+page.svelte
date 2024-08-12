<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import Record from './Record.svelte';
	//import RecordField from './RecordField.svelte';

	export let data;

	const superform = superForm(data.form, {
		taintedMessage: false,
		dataType: 'json'
	});
	const { form, message, enhance } = superform;
</script>

<SuperDebug data={$form} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<Record form={superform} field="message" />
	<!-- <RecordField field="message" form={superform} />
	<RecordField field="message" form={superform} /> -->
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
