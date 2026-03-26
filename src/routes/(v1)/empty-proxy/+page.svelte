<script lang="ts">
	import { superForm, stringProxy, intProxy } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, enhance } = superForm(data.form, {
		dataType: 'json',
		taintedMessage: null
	});

	const nullString = stringProxy(form, 'string', { empty: 'null' });
	const nullNumber = intProxy(form, 'num', { empty: 'null' });
	const undefString = stringProxy(form, 'string2', { empty: 'undefined' });
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
	<label>Null string <input name="string" bind:value={$nullString} /></label>
	<label>Null number <input name="num" bind:value={$nullNumber} /></label>
	<label>Undefined <input name="string2" bind:value={$undefString} /></label>
	<button>Submit</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
