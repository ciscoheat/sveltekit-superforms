<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import Field from './Field.svelte';

	export let data;

	const form = superForm(data.form, {
		taintedMessage: false
	});
</script>

<form method="POST" use:form.enhance>
	<Field {form} name="flavors" />
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
