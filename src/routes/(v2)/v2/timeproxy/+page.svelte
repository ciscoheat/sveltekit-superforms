<script lang="ts">
	import { dateProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
	const time = dateProxy(form, 'time', { format: 'time-utc', step: 1 });
	const datetime = dateProxy(form, 'datetime', { format: 'datetime-local', step: 1 });
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Time: <input
			name="time"
			type="time"
			step="1"
			bind:value={$time}
			aria-invalid={$errors.time ? 'true' : undefined}
		/>
		Date and time:
		<input
			name="datetime"
			type="datetime-local"
			step="1"
			bind:value={$datetime}
			aria-invalid={$errors.time ? 'true' : undefined}
		/>
		{#if $errors.time}<span class="invalid">{$errors.time}</span>{/if}
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
