<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form);
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<p>Edge case with tri-state boolean and union with same type.</p>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Active:
		<select name="active" bind:value={$form.active}>
			<option value={undefined}>Select option</option>
			<option value={false}>Disabled</option>
			<option value={true}>Enabled</option>
		</select>
		{#if $errors.active}<span class="invalid">{$errors.active}</span>{/if}
	</label>

	<label>
		Interval:
		<select name="interval" id="interval" bind:value={$form.interval}>
			<option value={1}>1 min</option>
			<option value={5}>5 min</option>
			<option value={10}>10 min</option>
			<option value={15}>15 min</option>
		</select>
		{#if $errors.interval}<span class="invalid">{$errors.interval}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		.invalid {
			color: crimson;
		}
	}
</style>
