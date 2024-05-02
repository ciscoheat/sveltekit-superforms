<script lang="ts">
	import { schemasafeClient } from '$lib/adapters/schemasafe.js';
	import { superForm } from '$lib/client/index.js';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, enhance } = superForm(data.form, { taintedMessage: null });
	const { form: form2 } = superForm(data.constForm, {
		validators: schemasafeClient(schema),
		taintedMessage: null
	});
	$: name = $form.name;
	$: name2 = $form2.name;
</script>

<form method="POST" use:enhance>
	<label for="name">Name ({name}{name2})</label>
	<input
		type="text"
		name="name"
		bind:value={$form.name}
		aria-invalid={$errors.name ? 'true' : undefined}
	/>
	{#if $errors.name}{$errors.name}{/if}

	<label for="email">E-mail</label>
	<input
		type="email"
		name="email"
		bind:value={$form.email}
		aria-invalid={$errors.email ? 'true' : undefined}
	/>
	{#if $errors.email}{$errors.email}{/if}

	<div><button>Submit</button></div>
</form>
