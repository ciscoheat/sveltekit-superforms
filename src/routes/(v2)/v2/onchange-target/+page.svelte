<script lang="ts">
	import { superForm } from '$lib/client/index.js';

	export let data;

	let changes = 0;

	const { form, errors, enhance } = superForm(data.form, {
		taintedMessage: null,
		onChange(event) {
			if (event.target) {
				changes = changes + 1;
			}
		}
	});
</script>

<div id="name">NAME:{$form.name}</div>

<div id="changes">CHANGES:{changes}</div>

<form method="POST" use:enhance>
	Name: <div class="edit" contenteditable="true" bind:textContent={$form.name}></div>
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
</form>

<style lang="scss">
	.edit {
		display: inline-block;
		min-width: 50%;
		background-color: #ddd;
		margin: 0.5rem;
	}

	form {
		margin: 2rem 0;

		.invalid {
			color: crimson;
		}
	}
</style>
