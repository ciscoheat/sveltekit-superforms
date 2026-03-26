<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { valibot } from '$lib/adapters/valibot.js';
	import { userSchema } from './schema.js';
	import { pick } from 'valibot';

	export let data;

	const userAuthSchema = pick(userSchema, ['email']);
	//type UserAuthSchema = typeof userAuthSchema;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		validators: valibot(userAuthSchema)
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Email: <input
			name="email"
			bind:value={$form.email}
			aria-invalid={$errors.email ? 'true' : undefined}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
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
