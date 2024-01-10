<script lang="ts">
	import { dateProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		dataType: 'json'
		//validators: schema
	});

	const proxy = dateProxy(form, 'entity.DOB', { format: 'date' });
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Entity type:
		<select bind:value={$form.entity.type}>
			<option value="person">Person</option>
			<option value="corporate">Corporate</option>
		</select>
	</label>

	{#if $form.entity.type == 'person'}
		<label>
			Date of Birth:
			<input type="date" bind:value={$proxy} />
		</label>
	{:else}
		<label>
			Tax ID:
			<input bind:value={$form.entity.taxId} />
		</label>
	{/if}

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
