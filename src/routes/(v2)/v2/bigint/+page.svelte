<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		A big number please: <input
			type="number"
			name="number"
			value={$form.number}
			oninput={(e) => ($form.number = BigInt(e.currentTarget.value))}
			aria-invalid={$errors.number ? 'true' : undefined}
		/>
		{#if $errors.number}<span class="invalid">{$errors.number}</span>{/if}
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
