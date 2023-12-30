<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, enhance } = superForm(data.form, {
		//dataType: 'json',
	});
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
	{$form.passwordConfirm}
	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
