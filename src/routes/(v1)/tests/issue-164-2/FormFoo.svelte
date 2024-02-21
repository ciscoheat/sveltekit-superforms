<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import { page } from '$app/stores';

	// eslint-disable-next-line svelte/valid-compile
	const { form, enhance, message, formId } = superForm($page.data.fooForm, {
		taintedMessage: null,
		resetForm: true,
		// invalidateAll appears to be the issue
		// when set to false the form resets to the previous successful value,
		// but I need it to be false so the data in "FormBar" doesn't get wiped out
		invalidateAll: false,
		onUpdated: () => {
			toggleEdit();
		},
		onError({ result }) {
			$message = result.error.message;
		}
	});

	$: console.log('FormFoo', $form, $formId);

	let isEditing = false;
	const toggleEdit = () => {
		isEditing = !isEditing;
	};
</script>

<div style="margin-top: 20px;">
	FormFoo
	<div class:hidden={!isEditing}>
		{#if $message}
			<div>{$message}</div>
		{/if}
		<form method="POST" use:enhance action="?/fooAction">
			<label for="name">Foo Name</label>
			<input type="text" name="name" bind:value={$form.name} />

			<div><button>Submit</button></div>
		</form>
	</div>

	<button type="button" on:click={() => toggleEdit()}>Edit</button>
</div>

<style>
	.hidden {
		visibility: hidden;
	}
</style>
