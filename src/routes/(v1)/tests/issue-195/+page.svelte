<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, errors, tainted, message } = superForm(data.form, {
		//dataType: 'json',
		//validators: zod(schema)
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST">
	<label class="flex items-center space-x-2">
		<input
			type="checkbox"
			class="checkbox"
			id="emaillist"
			name="emaillist"
			bind:checked={$form.emaillist}
		/> Emaillist
	</label>

	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}
	}
</style>
