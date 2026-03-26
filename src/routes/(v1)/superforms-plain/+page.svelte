<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { onMount } from 'svelte';

	export let data: PageData;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		//dataType: 'json',
		//validators: zod(schema)
	});

	onMount(() => {
		document.querySelector('head link[href="./sakura.css"]')?.remove();
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} status={false} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
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
