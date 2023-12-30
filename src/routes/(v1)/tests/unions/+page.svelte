<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, errors, enhance } = superForm(data.form, {
		dataType: 'json'
	});

	errors.update(($errors) => {
		if (!$errors.references) {
			$errors.references = { 0: { id: undefined } };
		}
		$errors.references[0].id = ['error'];
		return $errors;
	});
</script>

<SuperDebug data={{ $form, $errors }} />

<form method="POST" use:enhance>
	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
