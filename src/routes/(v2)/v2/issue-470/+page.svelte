<script lang="ts">
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	let changeEvent: unknown | undefined = undefined;
	const { form } = superForm(data.form, {
		onChange: (e) => {
			changeEvent = e;
		}
	});

	function setNumberTwice() {
		const value = Math.random();
		$form.value = value;
		$form.value = value;
	}
	function setNumberOnce() {
		const value = Math.random();
		$form.value = value;
	}
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

<p>
	Bug: If the same value is written twice, no change event is fired If first button is clicked, no
	change event is fired (however the value is updated). If the second button is clicked a change
	event is fired
</p>

<p>
	Change event was:
	<code>{JSON.stringify(changeEvent)}</code>
</p>

<button on:click={setNumberTwice}>Click me to set the same value twice</button>
<button on:click={setNumberOnce}>Click me to set a value once</button>
<button on:click={() => (changeEvent = undefined)}>Clear event</button>
