<script lang="ts">
	import { superForm } from '$lib/client/index.js';

	export let data;

	let log: string[] = [];

	const { form, errors, enhance } = superForm(data.form, {
		taintedMessage: null,
		onChange(event) {
			if (event.target) log = [...log, event.path];
			else log = [...log, ...event.paths];
		}
	});
</script>

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Email: <input name="email" bind:value={$form.email} />
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>
	<label>
		Agree: <input type="checkbox" name="agree" bind:checked={$form.agree} />
		{#if $errors.agree}<span class="invalid">{$errors.agree}</span>{/if}
	</label>
</form>

<button on:click={() => ($form.name = 'Programmatic change')}>Change name</button>

<hr />

<div id="log">Changes:{log.join('+')}</div>

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
