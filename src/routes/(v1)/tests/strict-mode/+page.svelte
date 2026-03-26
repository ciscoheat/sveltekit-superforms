<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { errors, enhance } = superForm(data.form);
</script>

<form method="POST" use:enhance>
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		.invalid {
			color: crimson;
		}
	}
</style>
