<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import Button from './Button.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const superform = superForm(data.form, { taintedMessage: false });
	const { form, errors, message, enhance } = superform;

	const set = new Map([
		['test', 123],
		['hello', 456]
	]);
</script>

<SuperDebug data={set} />

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
		Email: <input
			name="email"
			bind:value={$form.email}
			aria-invalid={$errors.email ? 'true' : undefined}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>
	<div>
		<Button form={superform} />
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
