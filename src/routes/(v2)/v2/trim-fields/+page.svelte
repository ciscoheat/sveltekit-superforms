<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		//dataType: 'json',
		validators: zod(schema)
	});

	function update() {
		form.update(
			($form) => {
				$form.name = '  Trim please  ';
				$form.direction = 'east';
				return $form;
			},
			{ taint: false }
		);
	}
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

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
		Direction:
		<select
			name="direction"
			bind:value={$form.direction}
			aria-invalid={$errors.direction ? 'true' : undefined}
		>
			<option value="north">North</option>
			<option value="south">South</option>
			<option value="east">East</option>
			<option value="west">West</option>
		</select>
		{#if $errors.direction}<span class="invalid">{$errors.direction}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<button on:click={update}>Programmatically</button>

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
