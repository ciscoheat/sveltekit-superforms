<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, errors, enhance, message } = superForm(data.loginForm, {
		invalidateAll: false
	});

	const {
		form: registerForm,
		errors: registerErrors,
		enhance: registerEnhance,
		message: registerMessage
	} = superForm(data.registerForm, {
		invalidateAll: false
	});
</script>

<SuperDebug data={{ $form, $registerForm }} />

{#if $message}<h3>{$message}</h3>{/if}
<form method="POST" action="?/login" use:enhance>
	Name: <input type="text" name="name" bind:value={$form.name} />
	<button>Submit</button>
	{#if $errors.name}
		<br /><span class="invalid">{$errors.name}</span>
	{/if}
</form>

<hr />

{#if $registerMessage}<h3>{$registerMessage}</h3>{/if}
<form method="POST" action="?/register" use:registerEnhance>
	Name: <input type="text" name="name" bind:value={$registerForm.name} />
	<button>Submit</button>
	{#if $registerErrors.name}
		<br /><span class="invalid">{$registerErrors.name}</span>
	{/if}
</form>
