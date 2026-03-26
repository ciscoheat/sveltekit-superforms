<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import NumberInput from './NumberInput.svelte';

	export let data;

	const superform = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
	const { form, errors, tainted, message, enhance, capture, restore } = superform;

	export const snapshot = { capture, restore };
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Score: <NumberInput form={superform} name="score" />
		{#if $errors.score}<span class="invalid">{$errors.score}</span>{/if}
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

		.invalid {
			color: crimson;
		}
	}
</style>
