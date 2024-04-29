<script lang="ts">
	import { schemasafeClient } from '$lib/adapters/schemasafe.js';
	import { superForm } from '$lib/client/index.js';
	import { schema } from './schema.js';

	export let data;

	const { form } = superForm(data.form);
	const { form: form2 } = superForm(data.constForm, {
		validators: schemasafeClient(schema)
	});
	const name: unknown = $form.name;
	const name2: string = $form2.name;
</script>

<form method="POST">
	<label for="name">Name ({name} {name2})</label>
	<input type="text" name="name" bind:value={$form.name} />

	<label for="email">E-mail</label>
	<input type="email" name="email" bind:value={$form.email} />

	<div><button>Submit</button></div>
</form>
