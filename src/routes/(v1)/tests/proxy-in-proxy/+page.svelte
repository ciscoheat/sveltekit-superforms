<script lang="ts">
	import { dateProxy, formFieldProxy, superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const theForm = superForm(data.form);
	const { errors } = formFieldProxy(theForm, 'date');
	const date = dateProxy(theForm.form, 'date', { format: 'date' });
</script>

<form method="POST" use:theForm.enhance>
	<label>
		Date: <input name="date" type="date" bind:value={$date} />
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
