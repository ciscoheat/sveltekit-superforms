<script lang="ts">
	import { schema as clientSchema } from './schema.js';
	import SuperDebug from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';

	export let data;

	const form = superForm(data.form, {
		taintedMessage: true,
		invalidateAll: 'force',
		dataType: 'json',
		validators: zodClient(clientSchema)
	});
	const {
		form: formData,
		enhance,
		errors,
		tainted,
		isTainted,
		delayed,
		allErrors,
		reset,
		message,
		constraints
	} = form;
</script>

<h3>Bugged Form</h3>
<h6>Steps to reproduce</h6>
<ol>
	<li>
		Click on <b>Set to null</b>
	</li>
	<li>Then click on <b>Set to random value</b></li>
</ol>
<p>
	After setting to random value, it is expected that superform will treat it as tainted. However,
	it's saying it is not tainted
</p>
<button
	on:click={() => {
		$formData.foo = null;
	}}>Set to null</button
>
<button
	on:click={() => {
		$formData.foo = {
			name: Math.random().toString()
		};
	}}>Set to random value</button
>
<hr />
<SuperDebug data={{ $formData, $tainted }} />

<style>
	hr {
		margin: 2rem 0;
	}
</style>
