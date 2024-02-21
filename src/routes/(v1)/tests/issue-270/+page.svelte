<script lang="ts">
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import { z } from 'zod';

	export let data;

	const { form, errors, message, enhance, allErrors } = superForm(data.form, {
		taintedMessage: null,
		validationMethod: 'submit-only',
		validators: zod(
			z.object({
				myString: z.string().min(10),
				myArray: z
					.number()
					.array()
					.default([-1])
					.refine((arg) => arg.every((n) => n >= 0), 'All numbers must >= 0')
			})
		)
	});
</script>

<h3>Submit-only validation</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<p>
	{#each $allErrors as error}
		{error.path}: {error.messages}<br />
	{/each}
</p>

<form method="POST" use:enhance>
	<label>
		My String<br />
		<input
			name="myString"
			aria-invalid={$errors.myString ? 'true' : undefined}
			bind:value={$form.myString}
		/>
	</label>

	<!-- <label>
    My Array[0]<br />
    <input
      name="myArray[0]"
      type="text"
      aria-invalid={$errors.myArray ? 'true' : undefined}
      bind:value={$form.myArray[0]}
    />
  </label> -->

	<button>Submit</button>
</form>

<style>
	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	input {
		background-color: #ddd;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
