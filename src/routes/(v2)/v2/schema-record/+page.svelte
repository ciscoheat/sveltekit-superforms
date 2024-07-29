<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import RecordField from './RecordField.svelte';

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
	<RecordField field="message.name" form={superform} />
	<RecordField field="message.id" form={superform} />
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
