<script lang="ts">
	import { goto } from '$app/navigation';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	let { data } = $props();

	const { form, errors, enhance } = superForm(data.form, {
		taintedMessage: null,
		onChange(e) {
			const id = e.get('id');
			if (id) goto('?id=' + id);
		}
	});
</script>

<SuperDebug data={$form} />

<h1>URL auto-update</h1>

<form method="POST" use:enhance>
	<label>
		Id<br />
		<input name="id" type="number" data-invalid={$errors.id} bind:value={$form.id} />
		{#if $errors.id}<span class="invalid">{$errors.id}</span>{:else}<span>OK</span>{/if}
	</label>

	<button>Submit</button>
</form>

<style>
	.invalid {
		color: red;
	}
</style>
