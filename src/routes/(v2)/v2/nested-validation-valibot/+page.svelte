<script lang="ts">
	import type { Infer, SuperValidated } from '$lib/index.js';
	import type { PageData } from './$types.js';
	import TagForm from './TagForm.svelte';
	import type { schema } from './schema.js';

	export let data: PageData;

	let output: (string[] | undefined)[] = [];
	let validated: SuperValidated<Infer<typeof schema>> | undefined = undefined;
</script>

<h2>Nested forms</h2>

<h4>With direct client-side validation</h4>

<div class="forms">
	<TagForm bind:validated bind:output data={data.form} validator="valibot" />
</div>

<pre style="margin-top:3rem;" id="valibot">
Valibot validate:
{#if output.length}{output.join('\n')}{/if}
</pre>

<pre style="margin-top:3rem;" id="valibot-full">
Valibot full validation:
{#if validated}{JSON.stringify(validated, null, 2)}{/if}
</pre>

<style>
	.forms {
		display: flex;
		gap: 7rem;
	}
</style>
