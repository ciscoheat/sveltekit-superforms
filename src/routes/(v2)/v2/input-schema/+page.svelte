<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance, input } = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
	const { input: input2 } = superForm(data.formNoInput);

	const len: number = $form.len;
	const inp: never = input2;

	len;
	input2;
	inp;
</script>

<SuperDebug data={{ $input, $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Test: <input
			name="test"
			bind:value={$input.test}
			aria-invalid={$errors.test ? 'true' : undefined}
		/>
		{#if $errors.test}<span class="invalid">{$errors.test}</span>{/if}
	</label>
	<label>
		Len: <input
			name="len"
			bind:value={$input.len}
			aria-invalid={$errors.len ? 'true' : undefined}
		/>
		{#if $errors.len}<span class="invalid">{$errors.len}</span>{/if}
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
