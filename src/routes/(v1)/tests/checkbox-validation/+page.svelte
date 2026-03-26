<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schemas.js';
	import Checkbox from './Checkbox.svelte';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, errors, tainted, enhance } = superForm(data.form, {
		validators: zod(schema),
		validationMethod: 'oninput'
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<form method="POST" use:enhance>
	<Checkbox
		name="isAccredited"
		label="I confirm that I am an accredited investor"
		bind:checked={$form.isAccredited}
	/>
	{#if $errors.isAccredited}<span class="invalid">{$errors.isAccredited}</span>{/if}
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}

	.invalid {
		color: red;
	}
</style>
