<script lang="ts">
	import { superForm } from '$lib/index.js';
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
		Fish:<br />
		{#each data.fish as fishName}
			<input name="fish" type="radio" value={fishName} bind:group={$form.fish} /> {fishName}<br />
		{/each}
		{#if $errors.fish}<span class="invalid">{$errors.fish}</span>{/if}
	</label>
	<label>
		More fish:<br />
		<select name="moreFish" bind:value={$form.moreFish}>
			<option value="">Pick one:</option>
			{#each data.fish as fishName}
				<option value={fishName}>{fishName}</option>
			{/each}
		</select>
		{#if $errors.moreFish}<span class="invalid">{$errors.moreFish}</span>{/if}
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
