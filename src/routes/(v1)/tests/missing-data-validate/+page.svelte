<script lang="ts">
	import { type Infer, superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import { superformClient } from '$lib/adapters/superform.js';
	import type { schema } from './schema.js';

	export let data: PageData;

	// Missing a field, which will result in a console error.
	// @ts-expect-error Clearing data for test purposes
	data.form.data = {};

	const { form, errors, message, enhance } = superForm(data.form, {
		//dataType: 'json',
		validators: superformClient<Infer<typeof schema>>({
			age(age) {
				if (age === undefined || isNaN(age) || age < 30) return 'At least 30 years, please!';
			},
			name(name) {
				if (!name || name.length < 2) return 'At least two characters, please!';
			}
		}),
		taintedMessage: null
	});
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Age: <input name="age" type="number" bind:value={$form.age} />
		{#if $errors.age}<span class="invalid">{$errors.age}</span>{/if}
	</label>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
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
