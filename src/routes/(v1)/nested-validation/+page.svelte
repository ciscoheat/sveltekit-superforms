<script lang="ts">
	import type { SuperValidated } from '$lib/index.js';

	import type { z } from 'zod';
	import type { PageData } from './$types.js';
	import TagForm from './TagForm.svelte';
	import type { schema } from './schema.js';

	export let data: PageData;

	let output: (string[] | undefined)[] = [];
	let output2: (string[] | undefined)[] = [];

	let validated: SuperValidated<z.infer<typeof schema>> | undefined = undefined;
	let validated2: SuperValidated<z.infer<typeof schema>> | undefined = undefined;
</script>

<h2>Nested forms</h2>

<h4>With direct client-side validation</h4>

<div class="forms">
	<TagForm bind:validated bind:output data={data.form} validator="zod" />
	<TagForm
		bind:validated={validated2}
		bind:output={output2}
		data={data.form2}
		validator="superforms"
	/>
</div>

<pre style="margin-top:3rem;" id="zod">
Zod validate:
{#if output.length}{output.join('\n')}{/if}
</pre>

<pre style="margin-top:3rem;" id="superforms">
Superforms validate:
{#if output2.length}{output2.join('\n')}{/if}
</pre>

<pre style="margin-top:3rem;" id="zod-full">
Zod full validation:
{#if validated}{JSON.stringify(validated, null, 2)}{/if}
</pre>

<pre style="margin-top:3rem;" id="superforms-full">
Superforms full validation:
{#if validated2}{JSON.stringify(validated2, null, 2)}{/if}
</pre>

<style>
	.forms {
		display: flex;
		gap: 7rem;
	}
</style>
