<script lang="ts">
	import type { SuperValidated } from '$lib/index.js';
	import type { Schema } from './schemas.js';
	import { superForm } from '$lib/client/index.js';
	import TextInput from './TextInput.svelte';
	import TextField from './TextField.svelte';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { fieldProxy } from '$lib/client/index.js';
	import type { z } from 'zod';

	export let data: SuperValidated<z.infer<Schema>>;

	const form = superForm(data, {
		dataType: 'json',
		taintedMessage: null
	});
	const { form: formData, errors, enhance, constraints, tainted, message } = form;

	/*
	const proxy1 = formFieldProxy(form, 'name');
	const proxy2 = formFieldProxy(form, 'name');
	const proxy3 = formFieldProxy(form, 'tags[3].name');
	const proxy4 = formFieldProxy(form, 'luckyNumber');
	const proxy5 = formFieldProxy(form, 'roles[0]');
	const bool = fieldProxy(formData, 'agree');
	*/

	const tag1 = fieldProxy(formData, 'tags[0].name');
	let field1 = fieldProxy(formData, 'luckyNumber');

	function randomLuckyNumber() {
		field1.update((num) => (num ? Math.ceil(Math.random() * 99) + 1 : 7));
	}
</script>

<SuperDebug data={$formData} />
<br />
<SuperDebug label="Tainted" status={false} data={$tainted} />

{#if $message}
	<h5 class="message">{$message}</h5>
{/if}

<form method="POST" use:enhance>
	<section>
		<TextInput label="name" bind:value={$formData.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

		<TextInput type="number" label="luckyNumber" bind:value={$formData.luckyNumber} />

		<TextField {form} field="address" />

		<TextInput
			name="city"
			label="city"
			bind:value={$formData.city}
			errors={$errors.city}
			constraints={$constraints.city}
		/>
	</section>

	<section>
		<h4>Tags</h4>
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each $formData.tags as _, i}
			{#if i % 2}
				<TextInput
					name="tags"
					label="Name"
					bind:value={$formData.tags[i].name}
					errors={$errors.tags?.[i]?.name}
					constraints={$constraints.tags?.name}
				/>
			{:else}
				<TextField name="tags" {form} field={`tags[${i}].name`} />
			{/if}
		{/each}
	</section>

	<button>Submit</button>

	<button on:click={randomLuckyNumber} type="button"> Random lucky number </button>

	<button type="button" on:click={() => ($tag1 = '')}> Clear first tag </button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	button {
		width: min-content;
	}

	section {
		display: flex;
		flex-direction: column;
	}

	h4 {
		margin: 0;
		margin-bottom: 1rem;
	}

	.message {
		padding: 1rem;
		color: mediumslateblue;
		background-color: springgreen;
	}

	.invalid {
		color: firebrick;
	}
</style>
