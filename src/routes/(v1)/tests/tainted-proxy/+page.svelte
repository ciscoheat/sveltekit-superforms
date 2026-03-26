<script lang="ts">
	import { formFieldProxy, superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const form = superForm(data.form, {
		dataType: 'json'
	});

	const { message, tainted: formTainted, enhance } = form;
	const { value, errors, tainted } = formFieldProxy(form, 'user.name');
</script>

<SuperDebug data={$formTainted} />

{#if $message}<h4>{$message}</h4>{/if}

<p>Proxy: {String($tainted)} - Form: {String($formTainted?.user?.name)}</p>

<p>
	<br />
	<button on:click={() => ($tainted = false)}>Untaint user.name</button>
</p>

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$value} />
		{#if $errors}<span class="invalid">{$errors}</span>{/if}
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
