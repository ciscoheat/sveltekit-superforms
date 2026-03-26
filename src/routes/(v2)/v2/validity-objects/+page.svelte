<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';

	export let data;

	const { form, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		dataType: 'json',
		customValidity: true,
		validators: zod(schema)
	});
</script>

<SuperDebug data={{ $form }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input
			bind:value={$form.priceRules[0].priceCategory.value}
			type="text"
			name="priceRules"
		/>
	</label>
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
	}
</style>
