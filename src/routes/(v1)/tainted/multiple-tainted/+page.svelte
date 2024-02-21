<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';

	export let data: PageData;

	let message = '';

	const { form, tainted, enhance } = superForm(data.form);

	function untaint() {
		if ($tainted) {
			$tainted.name = undefined;
			$tainted.city = false;
			delete $tainted.age;
		}
	}

	async function resetTainted() {
		// eslint-disable-next-line svelte/valid-compile
		if ($page.url.searchParams.has('timeout')) {
			setTimeout(untaint);
			message = 'timeout';
		} else {
			await tick();
			await tick();
			untaint();
			message = 'tick';
		}
	}

	afterNavigate((nav) => {
		console.log(nav);
		$form.name = 'Fred';
		$form.city = 'Berlin';
		$form.age = 28;

		resetTainted();
	});
</script>

<a href="?">Use tick</a> |
<a href="?timeout">Use timeout</a>

<h3>Triple Set via onMount</h3>

<h4>{message}</h4>

<form method="POST" use:enhance>
	<div>
		Name:
		<input type="text" name="name" bind:value={$form.name} />
	</div>

	<div>
		city:
		<input type="text" name="city" bind:value={$form.city} />
	</div>

	<div>
		Age:
		<input type="number" name="age" bind:value={$form.age} />
	</div>

	<div>
		<button type="submit">Submit</button>
	</div>
</form>

<h4>form</h4>
<SuperDebug data={$form} />
<h4>tainted</h4>
<SuperDebug data={$tainted} />
