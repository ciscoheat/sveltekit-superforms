<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import CheckBox from './CheckBox.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const theForm = superForm(data.form, {
		taintedMessage: false,
		onChange({ paths }) {
			console.log(paths);
		}
		//dataType: 'json',
	});

	const { form, errors, tainted, message, enhance } = theForm;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<div>Accept: <CheckBox form={theForm} field="accept" /></div>
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
